import React from 'react'
import Css from './danielo.module.scss'
import { rhythm } from '../utils/typography'

export default class Danielo extends React.Component {

    render () {
        return (
            <div className={`${Css['face-wrapper']} ${ this.props.expanded ? '' : Css['minimized'] }`}>
                <div className={Css['face-background']}>
                    <img src='danielo.png'></img>
                </div>
            </div>
        )
    }
}