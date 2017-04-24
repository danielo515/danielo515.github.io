import React , {PropTypes} from 'react'
import Styles from './icon.module.scss'
import { rhythm } from '../utils/typography'

import { Link } from 'react-router'
import { prefixLink } from 'gatsby-helpers'

export default class Icon extends React.Component {

    static propTypes = {
            size: PropTypes.oneOfType([PropTypes.number,PropTypes.string]), 
            padding: PropTypes.oneOfType([PropTypes.number,PropTypes.string]),
            classes: PropTypes.array,
            wrapperClasses: PropTypes.array
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