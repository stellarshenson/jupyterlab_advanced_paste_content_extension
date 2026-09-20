import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { requestAPI } from './request';

/**
 * Initialization data for the jupyterlab_advanced_paste_content_extension extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab_advanced_paste_content_extension:plugin',
  description: 'Jupyterlab extension that captures pasted content (text, file, graphics file / screenshot etc) and copies it to the current folder and in the receiving end (txt file, md file, python file or terminal). Extension will use different handlers to dedice how to handle the content',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('JupyterLab extension jupyterlab_advanced_paste_content_extension is activated!');

    requestAPI<any>('hello', app.serviceManager.serverSettings)
      .then(data => {
        console.log(data);
      })
      .catch(reason => {
        console.error(
          `The jupyterlab_advanced_paste_content_extension server extension appears to be missing.\n${reason}`
        );
      });
  }
};

export default plugin;
