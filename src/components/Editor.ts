/**
 * Copyright (c) 2018-present, Ephox, Inc.
 *
 * This source code is licensed under the Apache 2 license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import { ThisTypedComponentOptionsWithRecordProps } from 'vue/types/options';
import { CreateElement, Vue } from 'vue/types/vue';

import * as ScriptLoader from '../ScriptLoader';
import { getTinymce } from '../TinyMCE';
import { initEditor, isTextarea, mergePlugins, uuid } from '../Utils';
import { editorProps, IPropTypes } from './EditorPropTypes';

const scriptState = ScriptLoader.create();

declare module 'vue/types/vue' {
  interface Vue {
    elementId: string;
    element: Element | null;
    editor: any;
    inlineEditor: boolean;
  }
}

export interface IEditor extends Vue {
  $props: Partial<IPropTypes>;
}

const renderInline = (h: CreateElement, id: string, tagName?: string) => {
  return h(tagName ? tagName : 'div', {
    attrs: { id }
  });
};

const renderIframe = (h: CreateElement, id: string) => {
  return h('textarea', {
    attrs: { id },
    style: { visibility: 'hidden' }
  });
};

const initialise = (ctx: IEditor) => () => {
  const finalInit = {
    ...ctx.$props.init,
    readonly: ctx.$props.disabled,
    selector: `#${ctx.elementId}`,
    plugins: mergePlugins(ctx.$props.init && ctx.$props.init.plugins, ctx.$props.plugins),
    toolbar: ctx.$props.toolbar || (ctx.$props.init && ctx.$props.init.toolbar),
    inline: ctx.inlineEditor,
    setup: (editor: any) => {
      ctx.editor = editor;
      editor.on('init', (e: Event) => initEditor(e, ctx, editor));

      if (ctx.$props.init && typeof ctx.$props.init.setup === 'function') {
        ctx.$props.init.setup(editor);
      }
    }
  };

  if (isTextarea(ctx.element)) {
    ctx.element.style.visibility = '';
  }

  getTinymce().init(finalInit);
};

export const Editor: ThisTypedComponentOptionsWithRecordProps<Vue, {}, {}, {}, IPropTypes> = {
  props: editorProps,
  created() {
    this.elementId = this.$props.id || uuid('tiny-vue');
    this.inlineEditor = (this.$props.init && this.$props.init.inline) || this.$props.inline;
  },
  watch: {
    disabled() {
      (this as any).editor.setMode(this.disabled ? 'readonly' : 'design');
    }
  },
  mounted() {
    this.element = this.$el;

    if (getTinymce() !== null) {
      initialise(this)();
    } else if (this.element && this.element.ownerDocument) {
      const doc = this.element.ownerDocument;
      const channel = this.$props.cloudChannel ? this.$props.cloudChannel : '5';
      const apiKey = this.$props.apiKey ? this.$props.apiKey : 'no-api-key';

      ScriptLoader.load(scriptState, doc, `https://cdn.tiny.cloud/1/${apiKey}/tinymce/${channel}/tinymce.min.js`, initialise(this));
    }
  },
  beforeDestroy() {
    if (getTinymce() !== null) {
      getTinymce().remove(this.editor);
    }
  },
  render(h: any) {
    return this.inlineEditor ? renderInline(h, this.elementId, this.$props.tagName) : renderIframe(h, this.elementId);
  }
};
