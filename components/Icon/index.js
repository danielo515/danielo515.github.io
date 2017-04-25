import React, { PropTypes } from 'react'
import Styles from './icon.module.scss'
import { rhythm } from '../../utils/typography'

import { Link } from 'react-router'
import { prefixLink } from 'gatsby-helpers'

export default class Icon extends React.Component {

    static propTypes = {
        size: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        padding: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        classes: PropTypes.array,
        onClick: PropTypes.func,
        wrapperClasses: PropTypes.array,
        children: PropTypes.any
    }

    render() {

        const linkTo = this.props.linkTo || '#';
        const isButton = typeof this.props.onClick === 'function';
        const isExternalLink = linkTo.startsWith('http');
        const { classes, size, name, padding, wrapperClasses } = this.props;
        const iconProps = {
            className: `icon-${name} ` + (classes ? classes.join(' ') : ''),
            style: {}
        };

        const wrapperProps = {
            className: Styles['icon-wrapper'] + ' ' + (wrapperClasses ? wrapperClasses.join(' ') : ''),
            style: {}
        }

        size && (iconProps.style.fontSize = size + 'em');
        padding && (wrapperProps.style.padding = padding);

        const companionText = this.props.children ? <span>{this.props.children}</span> : null;


        return (
            <span {...wrapperProps}>
                {(isButton) ?
                    <button onClick={this.props.onClick}>
                        <span {...iconProps}></span>{companionText}
                    </button>
                    :
                    (isExternalLink) ?

                        <a href={linkTo}>
                            <span {...iconProps}></span>{companionText}
                        </a>
                        :
                        <Link to={prefixLink(linkTo)}>
                            <span {...iconProps}></span>{companionText}
                        </Link>
                }
            </span>
            )
    }
}