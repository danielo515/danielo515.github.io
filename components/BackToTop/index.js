import React from 'react'
import Css from './backtotop.module.scss'
import { rhythm } from '../../utils/typography'


export default class BackToTop extends React.Component {

    constructor(props){
        super(props);
        this.state = {
            required: false
        }
    }

    componentWillReceiveProps({scrollTop, windowHeight}){
        if( !this.state.required && (scrollTop >= windowHeight) ) return this.setState({required: true})
        if( this.state.required && scrollTop < (windowHeight/2) ) this.setState({required: false})
    }

    render () {

       const classes = [Css.wrapper, this.state.required ? Css.visible : ''].join(' ');
        return (
            <div className={classes}>
                <button className={Css.caret} onClick={this.props.onClick}>TOP</button>
            </div>
        )
    }
}