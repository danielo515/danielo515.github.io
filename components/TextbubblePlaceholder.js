import React from 'react'
import CSS from './textbubble.module'
import { rhythm } from '../utils/typography'

import Icon from './icon'
/**
 * This component just acts as placeholder of the text-bubble.
 * The objective is to keep enough space fot the text-bubble to appear without overlapping with any other element.
 * Because it is hard to calculate the size of an element and adjust the padding we leave that task to the browser, 
 * by placing an invisible element of the same size but WITHIN the page flow (the text-bubble is OUTSIDE the page flow)
 * 
 * @export
 * @class TextBubble
 * @extends {React.Component}
 */
export default class TextBubble extends React.Component {

    static propTypes() {
        return {
            children: React.PropTypes.any,
            text: React.PropTypes.string
        }
    }
     render() {

        const wrapperInline = {
            opacity: 0
        }

        const bubbleInline = {
            paddingLeft: rhythm(1/2),
            paddingTop: rhythm(1/3),
            paddingBottom: rhythm(1/3)
        }

        return (
            <div style={wrapperInline}>
                <div className={CSS['bubble']} style={bubbleInline}>
                    { this.props.text }
                </div>
            </div>
        )
    }
}