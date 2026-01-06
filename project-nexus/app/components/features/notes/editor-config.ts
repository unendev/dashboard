import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Typography from '@tiptap/extension-typography'
import { Extension } from '@tiptap/core'
import { CustomImage } from '@/lib/tiptap-extensions/custom-image'
import { DeleteLineExtension } from '@/lib/tiptap-extensions/delete-line'
import { SwapLineExtension } from '@/lib/swap-line-extension'
import { AutoOrderListExtension } from '@/lib/tiptap-extensions/auto-order-list'
import { Details } from '@/lib/tiptap-extensions/details'
import { DetailsSummary } from '@/lib/tiptap-extensions/details-summary'
import { DetailsContent } from '@/lib/tiptap-extensions/details-content'
import { WikiLink, createWikiLinkInputRule } from '@/lib/tiptap-extensions/wiki-link'

interface EditorConfigOptions {
  onWikiLinkClick: (target: string) => void;
  onImageUpload: (file: File) => Promise<string>;
}

export const getEditorExtensions = ({ onWikiLinkClick, onImageUpload }: EditorConfigOptions) => [
  StarterKit.configure({ 
    heading: { levels: [1, 2, 3] },
    bold: { HTMLAttributes: { class: 'font-bold' } },
    italic: { HTMLAttributes: { class: 'italic' } },
  }),
  Placeholder.configure({ placeholder: '开始写笔记...' }),
  Typography,
  CustomImage.configure({ allowBase64: true, HTMLAttributes: { class: 'tiptap-image' } }),
  DeleteLineExtension,
  SwapLineExtension,
  AutoOrderListExtension,
  Details,
  DetailsSummary,
  DetailsContent,
  WikiLink.configure({
    onLinkClick: onWikiLinkClick,
  }),
  Extension.create({
    name: 'wikiLinkInputRule',
    addInputRules() {
      return [createWikiLinkInputRule()]
    },
  }),
]

export const editorProps = {
  attributes: {
    class: 'prose prose-invert max-w-none focus:outline-none min-h-[200px] md:min-h-[400px] px-4 py-3',
  },
}
