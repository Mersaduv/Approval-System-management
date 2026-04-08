import { useEffect, useRef, useState } from 'react'

export default function HorizontalScrollTable({
    children,
    className = '',
    innerClassName = '',
}) {
    const topScrollRef = useRef(null)
    const bottomScrollRef = useRef(null)
    const contentRef = useRef(null)
    const syncingRef = useRef(false)
    const [hasHorizontalOverflow, setHasHorizontalOverflow] = useState(false)
    const [contentWidth, setContentWidth] = useState(0)

    useEffect(() => {
        const topNode = topScrollRef.current
        const bottomNode = bottomScrollRef.current

        if (!topNode || !bottomNode) {
            return undefined
        }

        const syncScroll = (source, target) => {
            if (syncingRef.current) {
                return
            }

            syncingRef.current = true
            target.scrollLeft = source.scrollLeft
            window.requestAnimationFrame(() => {
                syncingRef.current = false
            })
        }

        const handleTopScroll = () => syncScroll(topNode, bottomNode)
        const handleBottomScroll = () => syncScroll(bottomNode, topNode)

        topNode.addEventListener('scroll', handleTopScroll, { passive: true })
        bottomNode.addEventListener('scroll', handleBottomScroll, { passive: true })

        return () => {
            topNode.removeEventListener('scroll', handleTopScroll)
            bottomNode.removeEventListener('scroll', handleBottomScroll)
        }
    }, [])

    useEffect(() => {
        const updateMeasurements = () => {
            const contentNode = contentRef.current
            const bottomNode = bottomScrollRef.current

            if (!contentNode || !bottomNode) {
                return
            }

            const nextWidth = contentNode.scrollWidth
            setContentWidth(nextWidth)
            setHasHorizontalOverflow(nextWidth > bottomNode.clientWidth + 1)
        }

        updateMeasurements()

        let resizeObserver

        if (typeof ResizeObserver !== 'undefined' && contentRef.current) {
            resizeObserver = new ResizeObserver(() => {
                updateMeasurements()
            })

            resizeObserver.observe(contentRef.current)

            if (bottomScrollRef.current) {
                resizeObserver.observe(bottomScrollRef.current)
            }
        }

        window.addEventListener('resize', updateMeasurements)

        return () => {
            window.removeEventListener('resize', updateMeasurements)
            if (resizeObserver) {
                resizeObserver.disconnect()
            }
        }
    }, [children])

    return (
        <div className={`table-scroll-shell ${className}`}>
            {hasHorizontalOverflow && (
                <div className="table-scrollbar-rail">
                    <span className="table-scrollbar-label">Scroll</span>
                    <div ref={topScrollRef} className="table-scrollbar-track">
                        <div style={{ width: `${contentWidth}px` }} className="h-px" />
                    </div>
                </div>
            )}

            <div ref={bottomScrollRef} className={`table-scroll-content ${innerClassName}`}>
                <div ref={contentRef} className="inline-block min-w-full align-middle">
                    {children}
                </div>
            </div>

            {hasHorizontalOverflow && (
                <div className="table-scrollbar-footer">
                    <span className="table-scrollbar-label">Scroll</span>
                    <span className="table-scrollbar-caption">Use the bottom bar to see more columns</span>
                </div>
            )}
        </div>
    )
}
