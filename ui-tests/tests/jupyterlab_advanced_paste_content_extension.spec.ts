import { expect, test } from '@jupyterlab/galata';
import { Page } from '@playwright/test';

/**
 * A notebook carrying one markdown cell and one code cell.
 *
 * Built through the contents API rather than galata's createNew, which drives
 * the File menu and then waits for a kernel dialog. Neither is needed here, and
 * both are sensitive to whatever other extensions the JupyterLab under test
 * happens to have installed.
 */
const NOTEBOOK = JSON.stringify({
  cells: [
    { cell_type: 'markdown', metadata: {}, source: [] },
    {
      cell_type: 'code',
      metadata: {},
      execution_count: null,
      outputs: [],
      source: []
    }
  ],
  metadata: {
    kernelspec: {
      display_name: 'Python 3',
      language: 'python',
      name: 'python3'
    },
    language_info: { name: 'python' }
  },
  nbformat: 4,
  nbformat_minor: 5
});

/**
 * Dispatch a synthetic paste carrying rich HTML at whatever holds focus.
 */
async function pasteHtml(
  page: Page,
  html: string,
  text: string
): Promise<void> {
  await page.evaluate(
    ({ html, text }) => {
      const data = new DataTransfer();
      data.setData('text/html', html);
      data.setData('text/plain', text);
      document.activeElement?.dispatchEvent(
        new ClipboardEvent('paste', {
          clipboardData: data,
          bubbles: true,
          cancelable: true
        })
      );
    },
    { html, text }
  );
}

/**
 * Dispatch a synthetic paste carrying a bitmap, named the way a browser names
 * a clipboard image that has no source file.
 */
async function pasteBitmap(page: Page): Promise<void> {
  await page.evaluate(() => {
    const bytes = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01, 0x02, 0x03
    ]);
    const data = new DataTransfer();
    data.items.add(new File([bytes], 'image.png', { type: 'image/png' }));
    document.activeElement?.dispatchEvent(
      new ClipboardEvent('paste', {
        clipboardData: data,
        bubbles: true,
        cancelable: true
      })
    );
  });
}

test.describe('notebook surfaces', () => {
  test.beforeEach(async ({ page, tmpPath }) => {
    await page.contents.uploadContent(
      NOTEBOOK,
      'text',
      `${tmpPath}/paste.ipynb`
    );
    await page.notebook.openByPath(`${tmpPath}/paste.ipynb`);
  });

  test('rich HTML pasted into a markdown cell becomes markdown', async ({
    page
  }) => {
    await page.notebook.enterCellEditingMode(0);
    await pasteHtml(page, '<h2>Title</h2><ul><li>one</li></ul>', 'Title one');

    await expect
      .poll(async () => page.notebook.getCellTextInput(0), { timeout: 15000 })
      .toContain('## Title');
  });

  test('rich HTML pasted into a code cell arrives as the plain text flavour', async ({
    page
  }) => {
    // Asserting the ABSENCE of markup would pass on an empty cell and would
    // keep passing if the code-cell branch were deleted. Assert the positive.
    await page.notebook.enterCellEditingMode(1);
    await pasteHtml(page, '<h2>Title</h2>', 'Title');

    await expect
      .poll(async () => page.notebook.getCellTextInput(1), { timeout: 15000 })
      .toContain('Title');
    expect(await page.notebook.getCellTextInput(1)).not.toContain('## Title');
  });

  test('a bitmap pasted into a markdown cell writes that file and links it', async ({
    page,
    tmpPath
  }) => {
    await page.notebook.enterCellEditingMode(0);
    await pasteBitmap(page);

    await expect
      .poll(async () => page.notebook.getCellTextInput(0), { timeout: 15000 })
      .toMatch(/!\[\]\(<paste-[0-9]{8}-[0-9]{6}\.png>\)/);

    // Read the name the extension actually chose and assert that exact file
    // exists beside the notebook. A prefix plus toBeDefined() would pass for
    // false, and would not prove the folder.
    const source = (await page.notebook.getCellTextInput(0)) || '';
    const match = source.match(/<(paste-[0-9]{8}-[0-9]{6}\.png)>/);
    expect(match).not.toBeNull();

    expect(await page.contents.fileExists(`${tmpPath}/${match![1]}`)).toBe(
      true
    );
  });

  test('a bitmap pasted into a code cell inserts a quoted filename', async ({
    page
  }) => {
    await page.notebook.enterCellEditingMode(1);
    await pasteBitmap(page);

    await expect
      .poll(async () => page.notebook.getCellTextInput(1), { timeout: 15000 })
      .toMatch(/^"paste-[0-9]{8}-[0-9]{6}\.png"$/);
  });
});

/**
 * Start recording everything the current terminal's shell prints. The echo of
 * what arrives on stdin is part of it, so an insertion shows up here too.
 */
async function recordShellOutput(page: Page): Promise<void> {
  await page.evaluate(() => {
    const win = window as any;
    const session = win.jupyterapp.shell.currentWidget.content.session;
    win.shellOutput = '';
    session.messageReceived.connect((_: unknown, message: any) => {
      if (message.type === 'stdout') {
        win.shellOutput += message.content.join('');
      }
    });
  });
}

/** What the shell has printed since recordShellOutput, escape codes removed. */
async function shellOutput(page: Page): Promise<string> {
  const raw = await page.evaluate(() => (window as any).shellOutput as string);
  return raw.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '');
}

test.describe('terminal surface', () => {
  test('a bitmap pasted into a terminal lands in the file browser folder and the shell reaches it', async ({
    page,
    tmpPath
  }) => {
    await page.contents.createDirectory(`${tmpPath}/browser`);
    await page.contents.createDirectory(`${tmpPath}/shell`);
    await page.filebrowser.openDirectory(`${tmpPath}/browser`);

    // The shell sits in a sibling of the folder the file browser shows.
    // The command resolves to the widget, which cannot cross back to the test.
    await page.evaluate(async cwd => {
      await (window as any).jupyterapp.commands.execute('terminal:create-new', {
        cwd
      });
    }, `${tmpPath}/shell`);
    await page.locator('.jp-Terminal').waitFor();
    await recordShellOutput(page);
    await page.locator('.jp-Terminal').click();

    // A short prompt keeps the command line on one row, so the echo of the
    // inserted path is not broken by a wrap.
    await page.keyboard.type("PS1='$ '; echo READY-$((1+1))");
    await page.keyboard.press('Enter');
    await expect
      .poll(async () => shellOutput(page), { timeout: 15000 })
      .toContain('READY-2');

    await page.keyboard.type('test -f ');
    await pasteBitmap(page);

    // The file lands beside the file browser, so the shell gets a path that
    // climbs out of its own folder to reach it.
    await expect
      .poll(async () => shellOutput(page), { timeout: 15000 })
      .toMatch(/test -f \.\.\/browser\/paste-[0-9]{8}-[0-9]{6}\.png/);
    const name = (await shellOutput(page)).match(
      /\.\.\/browser\/(paste-[0-9]{8}-[0-9]{6}\.png)/
    )![1];

    // The echo shows the command, not its result, so the result is computed.
    await page.keyboard.type(' && echo FOUND-$((40+2))');
    await page.keyboard.press('Enter');
    await expect
      .poll(async () => shellOutput(page), { timeout: 15000 })
      .toContain('FOUND-42');

    expect(await page.contents.fileExists(`${tmpPath}/browser/${name}`)).toBe(
      true
    );
    expect(await page.contents.fileExists(`${tmpPath}/shell/${name}`)).toBe(
      false
    );
  });
});
