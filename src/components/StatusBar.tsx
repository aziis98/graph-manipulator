import { createContext, type ComponentChildren } from 'preact'
import { useContext, useMemo, useState } from 'preact/hooks'

const StatusBarContext = createContext<{
    messages: Map<string, string>
    setMessages: (msgs: Map<string, string>) => void
} | null>(null)

export const StatusBarProvider = ({ children }: { children: ComponentChildren }) => {
    const [messages, setMessages] = useState<Map<string, string>>(new Map([['000_status', 'Ready']]))

    return <StatusBarContext.Provider value={{ messages, setMessages }}>{children}</StatusBarContext.Provider>
}

export const useStatusBar = () => {
    const ctx = useContext(StatusBarContext)
    if (!ctx) {
        throw new Error('useStatusBar must be used within a StatusBarProvider')
    }

    const onHover = useMemo(
        () => (key: string, message: string) => ({
            onPointerEnter: () => {
                const newMessages = new Map(ctx.messages)
                newMessages.set(key, message)
                ctx.setMessages(newMessages)
            },
            onPointerLeave: () => {
                const newMessages = new Map(ctx.messages)
                newMessages.delete(key)
                ctx.setMessages(newMessages)
            },
        }),
        [ctx]
    )

    return {
        setMessage: (key: string, message: string) => {
            const newMessages = new Map(ctx.messages)
            newMessages.set(key, message)
            ctx.setMessages(newMessages)
        },
        clearMessage: (key: string) => {
            const newMessages = new Map(ctx.messages)
            newMessages.delete(key)
            ctx.setMessages(newMessages)
        },
        getMessage: (key: string) => {
            return ctx.messages.get(key) || null
        },
        getMessages: () => {
            return Array.from(ctx.messages.entries())
        },
        onHover,
    }
}

export const StatusBar = ({}) => {
    const { getMessages } = useStatusBar()

    return (
        <div class="status-bar">
            {getMessages()
                .sort(([k1], [k2]) => k1.localeCompare(k2))
                .map(([k, v]) => (
                    <div class="status-message" key={k} title={k}>
                        {v}
                    </div>
                ))}
        </div>
    )
}
