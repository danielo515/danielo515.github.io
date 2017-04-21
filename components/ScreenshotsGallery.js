import React from 'react'
import CSS from './screenshotsgallery.module.scss'
import { rhythm } from '../utils/typography'


export default class ProjectHeader extends React.Component {

    static propTypes() {
        return {
            info: React.PropTypes.object,
        }
    }

    render(){
        const {info} = this.props

        const screenshots = info.screenshots.map(s => <span className={`screenshot ${CSS['screenshot']}`}><img src={s}/></span>);


        return (
            <div>
                <h2>Screenshots</h2>
                <div className={`gallery ${CSS['gallery']}`}>
                    {screenshots}
                </div>
            </div>
       )
    }
}