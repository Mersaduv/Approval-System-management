import { useEffect, useRef, useState } from 'react'

export default function HorizontalScrollTable({
    children,
    className = '',
    tableClassName = '',
}) {
    const topScrollRef = useRef(null)
    const tableScrollRef = useRef(null)
    const [hasHorizontalOverflow, setHasHorizontalOverflow] = useState(false)

    useEffect(() => {
        const topScroll = topScrollRef.current
        const tableScroll = tableScrollRef.current

        if (!topScroll || !tableScroll) {
            return undefined
        }

        const updateTopScrollbarWidth = () => {
            const table = tableScroll.querySelector('table')
            const spacer = topScroll.firstElementChild

            if (!table || !spacer) {
                return
            }

            spacer.style.width = `${table.scrollWidth}px`
            setHasHorizontalOverflow(table.scrollWidth > tableScroll.clientWidth + 1)
        }

        const handleTableScroll = () => {
            topScroll.scrollLeft = tableScroll.scrollLeft
        }

        const handleTopScroll = () => {
            tableScroll.scrollLeft = topScroll.scrollLeft
        }

        updateTopScrollbarWidth()

        const resizeObserver = new ResizeObserver(() => {
            updateTopScrollbarWidth()
        })

        const table = tableScroll.querySelector('table')
        if (table) {
            resizeObserver.observe(table)
        }
        resizeObserver.observe(tableScroll)

        window.addEventListener('resize', updateTopScrollbarWidth)
        tableScroll.addEventListener('scroll', handleTableScroll)
        topScroll.addEventListener('scroll', handleTopScroll)

        return () => {
            window.removeEventListener('resize', updateTopScrollbarWidth)
            tableScroll.removeEventListener('scroll', handleTableScroll)
            topScroll.removeEventListener('scroll', handleTopScroll)
            resizeObserver.disconnect()
        }
    }, [children])

    return (
        <div className={className}>
            {hasHorizontalOverflow && (
                <div
                    ref={topScrollRef}
                    className="table-top-scroll overflow-x-auto overflow-y-hidden scrollbar-thin"
                    style={{ height: '17px', direction: 'ltr' }}
                >
                    <div style={{ height: '1px' }} className="min-w-full" />
                </div>
            )}

            <div
                ref={tableScrollRef}
                className={`table-bottom-scroll overflow-x-auto ${tableClassName}`}
            >
                {children}
            </div>
        </div>
    )
}
