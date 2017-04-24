import React from 'react'
import CSS from './screenshotcard.module.scss'
import { rhythm } from '../utils/typography'
import Icon from './Icon'


export default class ScreenshotCard extends React.Component {

    static propTypes = {
                    cardInfo: React.PropTypes.object,
        
    }

    constructor (props) {
        super(props);
        this.state = { active: false }
    }

    styles ( ...classes) {
       return { className: classes.map( s => CSS[s]).join(' ')}
    }



    render () {

        const imgUrl = this.props.cardInfo.path + this.props.cardInfo.data.screenshots[0];
        const backgroundImage = `url( ${imgUrl})`;
        const styles = {
           backgroundImage
        }

        const {cardInfo} = this.props;

        return (
            <span className={CSS['wrapper']}>
                <div {...this.styles('card')} /*style={styles}*/ onClick={ () => this.setState({active: !this.state.active})}>
                    <img src={imgUrl} alt=""/>
                    <div {...this.styles( 'glass', this.state.active ? 'active' : '')}>
                        <div className={CSS['content']}>
                            {this.props.cardInfo.data.description}
                            <div className={CSS['icons']}>
                                <Icon size="1" padding='1em' name="eye" linkTo={cardInfo.path}></Icon>
                                <Icon size="1" padding='1em' name="external-link-square"></Icon>
                            </div>
                        </div>
                    </div>
                </div>
            </span>
        );
    }

}