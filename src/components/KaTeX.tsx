import katex from "katex"
import { memo } from "preact/compat"

type Props = {
    value: string
}

export const Katex = memo(({ value }: Props) => {
    return (
        <div
            class="katex-content"
            ref={el => {
                if (!el) return

                katex.render(value, el, {
                    throwOnError: false,
                    displayMode: true,
                })
            }}
        />
    )
})
