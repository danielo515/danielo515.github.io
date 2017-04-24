import React from 'react'
import CSS from './projectheader.module.scss'
import { rhythm } from '../utils/typography'


export default class ProjectHeader extends React.Component {

    static propTypes = {
            info: React.PropTypes.object,

    }

    render(){
        console.log(CSS);
        const {info} = this.props
        return (
            <div className={CSS['wrapper']}>
                <div className={CSS['table']}>
            
                    <div className={CSS['row']}><label > Name: </label> <span > {info.name} </span></div>
                    <div className={CSS['row']}><label > Technologies: </label> <span > {info.technology} </span></div>
                </div>
                <hr/>
            </div>
       )
    }
}