import React from 'react'
import Styles from './icon.module.scss'
import { rhythm } from '../utils/typography'

import { Link } from 'react-router'
import { prefixLink } from 'gatsby-helpers'

export default class Icon extends React.Component {

    static propTypes() {
        return {
            size: React.PropTypes.number,
            padding: React.PropTypes.string,
            classes: React.PropTypes.array,
            wrapperClasses: React.PropTypes.array
        }
    }

    render(){

        const linkTo = this.props.linkTo || '#';
        const isExternalLink = linkTo.startsWith('http');
        const {classes, size, name, padding, wrapperClasses } = this.props;
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

         return <span {...wrapperProps}>
         { (isExternalLink) ?

                <a href={linkTo}>
                    <span {...iconProps}></span>
                </a>
                :
                <Link to={prefixLink(linkTo)}>
                    <span {...iconProps}></span>
                </Link>
         }
            </span>
    }
}