import React from 'react'
import CSS from './textbubble.module'
import { rhythm } from '../../utils/typography'

export default class TextBubble extends React.Component {

    static propTypes = {
            children: React.PropTypes.any,
            text: React.PropTypes.string
    }

    styles(name) {
        return { className: CSS[name] }
    }

    render() {
        const wrapperStyles = {
            className: `${CSS['wrapper']} ${this.props.visible ? CSS['visible'] : CSS['hidden']}`
        }

        const bubbleInline = {
            paddingLeft: rhythm(1/2),
            paddingTop: rhythm(1/3),
            paddingBottom: rhythm(1/3)
        }

        return (

            <div>
                <div className={[CSS.bubble,CSS['placeholder']].join(' ')} style={bubbleInline}>{ this.props.text }</div>
                <div {...wrapperStyles}>
                    <div className={CSS['bubble']} style={bubbleInline}>
                        { this.props.text }
                    </div>
                </div>
            </div>
        )
    }
}