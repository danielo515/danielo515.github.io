import React from 'react'
import Css from './danielo.module.scss'
import { rhythm } from '../utils/typography'

import Icon from './icon'

export default class Danielo extends React.Component {

    constructor(props){
        super(props);
        this.state = {
            minimized: false
        }
    }

    minimize(){
        (!this.state.minimized) && this.setState({minimized:true})
    }

    expand(){
        (this.state.minimized) && this.setState({minimized:false})        
    }

    render () {
        return (
            <div className={`${Css['face-wrapper']} ${this.state.minimized ? Css['minimized'] : '' }`}>
                <div className={Css['face-background']}>
                    <img src='danielo.png'></img>
                </div>
                <div className={Css['menu-wrapper']}>
                    <div className={Css['menu-body']}>
                        <Icon name="drivers-license" classes={[Css.icon]} wrapperClasses={[Css['icon-wrapper']]}></Icon>
                    </div>
                    <div className={Css['menu-bottom']}></div>
                </div>
            </div>
        )
    }
}