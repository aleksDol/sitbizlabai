"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import Image from "@tiptap/extension-image";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/react";
import { uploadImage } from "./upload-image";
import styles from "./tiptap-editor.module.css";

type TiptapEditorProps = {
  value: string;
  onChange: (value: string) => void;
};

export function TiptapEditor({ value, onChange }: TiptapEditorProps) {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [StarterKit, Image],
    content: value || "<p></p>",
    immediatelyRender: false,
    onUpdate({ editor: currentEditor }) {
      onChange(currentEditor.getHTML());
    },
    editorProps: {
      attributes: {
        class: styles.editor,
      },
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    if (editor.getHTML() !== value) {
      editor.commands.setContent(value || "<p></p>", { emitUpdate: false });
    }
  }, [editor, value]);

  const uploadAndInsertImage = async (file: File) => {
    if (!editor) {
      return;
    }

    try {
      setUploadError(null);
      setUploading(true);
      const url = await uploadImage(file);
      editor.chain().focus().setImage({ src: url }).run();
      onChange(editor.getHTML());
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Image upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const onPickImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    await uploadAndInsertImage(file);
    event.target.value = "";
  };

  if (!editor) {
    return <div className={styles.loading}>Loading editor...</div>;
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.toolbar}>
        <button
          type="button"
          className={styles.tool}
          onClick={() => editor.chain().focus().toggleBold().run()}
          aria-label="Bold"
        >
          Bold
        </button>
        <button
          type="button"
          className={styles.tool}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          aria-label="Italic"
        >
          Italic
        </button>
        <button
          type="button"
          className={styles.tool}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          aria-label="Bullet list"
        >
          List
        </button>
        <button
          type="button"
          className={styles.tool}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          aria-label="Insert image"
        >
          {uploading ? "Uploading..." : "Image"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className={styles.hiddenInput}
          onChange={onPickImage}
        />
      </div>

      <EditorContent editor={editor} />

      {uploadError ? <p className={styles.error}>{uploadError}</p> : null}
    </div>
  );
}
