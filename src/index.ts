import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { PathExt } from '@jupyterlab/coreutils';
import { IDefaultFileBrowser } from '@jupyterlab/filebrowser';
import { IEditorTracker } from '@jupyterlab/fileeditor';
import { INotebookTracker } from '@jupyterlab/notebook';
import { ITerminalTracker } from '@jupyterlab/terminal';

import { writeAll } from './batch';
import { classify } from './content';
import { decide, separatorFor } from './decide';
import { reportFailure } from './failure';
import { MAX_PAYLOAD_BYTES, isWritableSize, receives } from './guards';
import { htmlToMarkdown } from './markdown';
import { timestampName } from './naming';
import { ReferenceKind, referenceFor } from './reference';
import { writeFile } from './request';
import { Surface, surfaceForCellType, surfaceForPath } from './surface';

/**
 * Where a paste landed: which surface, which folder it writes into, and how to
 * put text at the cursor.
 */
interface ITarget {
  surface: Surface;
  folder: string;
  /** The element the paste must have landed in for this target to apply. */
  host: Node | null | undefined;
  /** Returns false when the surface has gone away and the text did not land. */
  insert: (text: string) => boolean;
  /**
   * Terminal name, on the terminal surface only. The server reads the shell's
   * working directory from it and answers the path the shell reaches the file
   * by, because the frontend cannot read that directory.
   */
  terminal?: string;
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  let binary = '';
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}

/**
 * Initialization data for the jupyterlab_advanced_paste_content_extension extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab_advanced_paste_content_extension:plugin',
  description:
    'Writes pasted content to disk and inserts a reference to it, choosing the handler by content type and the reference by receiving surface',
  autoStart: true,
  requires: [INotebookTracker, IEditorTracker, IDefaultFileBrowser],
  optional: [ITerminalTracker],
  activate: (
    app: JupyterFrontEnd,
    notebooks: INotebookTracker,
    editors: IEditorTracker,
    browser: IDefaultFileBrowser,
    terminals: ITerminalTracker | null
  ) => {
    const settings = app.serviceManager.serverSettings;

    /**
     * Resolve the current surface, or null when the active widget is not one
     * this extension covers. The console prompt and the settings editor are
     * deliberately not covered.
     */
    const resolveTarget = (): ITarget | null => {
      const current = app.shell.currentWidget;

      if (current && current === notebooks.currentWidget) {
        const panel = notebooks.currentWidget;
        const cell = panel.content.activeCell;
        if (!cell) {
          return null;
        }
        return {
          surface: surfaceForCellType(cell.model.type),
          folder: PathExt.dirname(panel.context.path),
          host: cell.editor?.host,
          insert: text => {
            // The write is asynchronous, so the cell may be gone by now.
            if (cell.isDisposed || !cell.editor) {
              return false;
            }
            cell.editor.replaceSelection?.(text);
            return true;
          }
        };
      }

      if (current && current === editors.currentWidget) {
        const widget = editors.currentWidget;
        return {
          surface: surfaceForPath(widget.context.path),
          folder: PathExt.dirname(widget.context.path),
          host: widget.content.editor.host,
          insert: text => {
            if (widget.isDisposed) {
              return false;
            }
            widget.content.editor.replaceSelection?.(text);
            return true;
          }
        };
      }

      if (terminals && current && current === terminals.currentWidget) {
        const session = terminals.currentWidget.content.session;
        return {
          surface: 'terminal',
          // The folder the user is looking at, not the shell's: the shell is
          // handed a path to the file instead of its bare name.
          folder: browser.model.path,
          host: terminals.currentWidget.content.node,
          terminal: session.name,
          insert: text => {
            session.send({ type: 'stdin', content: [text] });
            return true;
          }
        };
      }

      return null;
    };

    /**
     * Write one payload and return the reference the surface calls for.
     */
    const write = async (
      target: ITarget,
      file: File,
      filename: string,
      kind: ReferenceKind
    ): Promise<string> => {
      const buffer = await file.arrayBuffer();
      const result = await writeFile(
        settings,
        target.folder,
        filename,
        toBase64(buffer),
        target.terminal
      );
      return referenceFor(
        target.surface,
        result.terminal_path ?? result.filename,
        kind
      );
    };

    /**
     * Write every payload and insert all their references at the paste point.
     *
     * References are separated by a blank line where the surface renders
     * markdown, so each link is its own paragraph, and by a space elsewhere,
     * because a newline in a terminal would run the line.
     */
    const writeAllAndInsert = (
      target: ITarget,
      payloads: { file: File; filename: string; kind: ReferenceKind }[]
    ): Promise<void> =>
      writeAll(
        payloads,
        payload => write(target, payload.file, payload.filename, payload.kind),
        text => {
          // A written file with no reference and no message is the worst
          // outcome: the user cannot even learn its name. Report it.
          if (!target.insert(text)) {
            reportFailure(
              new Error(
                `Wrote the pasted content, but the editor had closed before it ` +
                  `could be inserted. It is on disk as: ${text}`
              )
            );
          }
        },
        separatorFor(target.surface)
      );

    /**
     * Binary content always becomes a file. Rich HTML is converted only on the
     * two surfaces that render markdown; on every other surface, and for plain
     * text everywhere, the browser's own paste already produces the specified
     * result and is left alone.
     */
    const onPaste = (event: ClipboardEvent): void => {
      if (!event.clipboardData) {
        return;
      }
      const target = resolveTarget();
      if (!target) {
        return;
      }
      // The surface comes from the shell, which does not move when focus sits in
      // a dialog, a side panel or the search field. Without this the paste aimed
      // at one of those would be cancelled and written into the active cell.
      if (!receives(target.host, event.target)) {
        return;
      }
      const content = classify(event.clipboardData);
      if (!content) {
        return;
      }

      const action = decide(content, target.surface);

      // Refuse an oversized payload before cancelling the browser's own paste,
      // so the fallback is the behaviour the user already understands.
      const payloads =
        action.kind === 'write-bitmap'
          ? [action.file]
          : action.kind === 'write-files'
            ? action.files
            : [];
      const oversized = payloads.find(file => !isWritableSize(file.size));
      if (oversized) {
        reportFailure(
          new Error(
            `${oversized.name} is larger than the ` +
              `${Math.round(MAX_PAYLOAD_BYTES / (1024 * 1024))} MB paste limit. ` +
              `Use the file browser's Upload instead.`
          )
        );
        return;
      }

      // xterm's own paste handler does not check defaultPrevented, so without
      // stopping propagation the terminal would receive the plain-text flavour
      // as well as the reference this extension inserts.
      const cancel = (): void => {
        event.preventDefault();
        if (target.surface === 'terminal') {
          event.stopPropagation();
        }
      };

      if (action.kind === 'write-bitmap') {
        cancel();
        void writeAllAndInsert(target, [
          {
            file: action.file,
            filename: timestampName(new Date(), action.extension),
            kind: 'image'
          }
        ]).catch(reportFailure);
        return;
      }

      if (action.kind === 'write-files') {
        cancel();
        void writeAllAndInsert(
          target,
          action.files.map(file => ({
            file,
            filename: file.name,
            kind: 'file' as const
          }))
        ).catch(reportFailure);
        return;
      }

      if (action.kind === 'insert-markdown') {
        cancel();
        target.insert(htmlToMarkdown(action.html, action.text));
      }
    };

    document.addEventListener('paste', onPaste, true);
  }
};

export default plugin;
