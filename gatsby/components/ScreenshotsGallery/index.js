import React from 'react'
import CSS from './screenshotsgallery.module.scss'
import { rhythm } from '../../utils/typography'


export default class ScreenshotsGallery extends React.Component {

    static propTypes = {
            info: React.PropTypes.object,
    
    }

    render(){
        const {info} = this.props

        const screenshots = info.screenshots ? info.screenshots
                .map(s => 
                    <span key={s} className={`screenshot ${CSS['screenshot']}`}>
                        <img src={s}/>
                    </span>
                ) 
                : 
                null;


        return (
            <div>
                <h2 id='gallery'>Gallery</h2>
                <div className={`gallery ${CSS['gallery']}`}>
                    {screenshots}
                </div>
            </div>
       )
    }
}