import type { ComponentChildren } from "preact"
import { useState } from "preact/hooks"

export const Editable = ({
    value,
    onChange,
    multiline = false,
    children,
}: {
    value: string
    onChange: (newValue: string) => void
    children?: ComponentChildren
    multiline?: boolean
}) => {
    const [editing, setEditing] = useState(false)
    const [draftValue, setDraftValue] = useState(value)

    const handleInput = (e: Event) => {
        setDraftValue((e.currentTarget as HTMLInputElement | HTMLTextAreaElement).value)
    }

    const handleBlur = () => {
        setEditing(false)
        onChange(draftValue)
    }

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault()
            setEditing(false)
            onChange(draftValue)
        } else if (e.key === "Escape") {
            e.preventDefault()
            setEditing(false)
            setDraftValue(value)
        }
    }

    return (
        <div class="editable" onDblClick={() => setEditing(true)}>
            {editing ? (
                multiline ? (
                    <textarea
                        ref={$el => $el?.focus()}
                        rows={Math.min(10, Math.max(3, draftValue.split("\n").length))}
                        value={draftValue}
                        onInput={handleInput}
                        onBlur={handleBlur}
                        onKeyDown={handleKeyDown}
                        autofocus
                    ></textarea>
                ) : (
                    <input
                        type="text"
                        ref={$el => $el?.focus()}
                        value={draftValue}
                        onInput={handleInput}
                        onBlur={handleBlur}
                        onKeyDown={handleKeyDown}
                        autofocus
                    />
                )
            ) : (
                <>{children ?? <pre>{value}</pre>}</>
            )}
        </div>
    )
}
