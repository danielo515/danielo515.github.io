import React, {PropTypes} from 'react'
import ReactDOM from 'react-dom'
import CSS from './section.module'
import { rhythm } from '../../utils/typography'


import TextBubble from '../TextBubble'
import ScreenshotCard from '../ScreenshotCard'
import {isActiveSection} from '../../utils/domUtils'

export default (WrappedComponent) => class Section extends React.Component {

    static propTypes = {
        
            windowHeight: React.PropTypes.number,
            sectionInfo: PropTypes.object
        
    }

    constructor(props){
        super(props)
        this.state = {
            active: false
        }
    }

    componentDidMount() {
        this.elementBox = this.node.getBoundingClientRect();
        this.elementHeight = this.node.clientHeight;
    }

    componentDidUpdate() {

        this.elementBox = this.node.getBoundingClientRect();
        this.elementHeight = this.node.clientHeight;

        // let url = Navigator.genURL(this.props.section_name || this.props.parentName);
        // console.log(this.props.name , this.elementBox);
        if ( isActiveSection(this.elementBox, this.elementHeight) ) {
            //   Navigator.setURL(this.props.section_name || this.props.parentName)
            if( !this.state.active ) this.setState({active: true});
        } else {
           if( this.state.active ) this.setState({active: false})
        }
    }

    render() {

        const {sectionInfo, language} = this.props;
        const containerClasses = `${CSS['container']} ${this.props.even ? CSS['even'] : CSS['odd']}`;
        const bubbleText = sectionInfo.bubble[language];

        return (
            <section // class container
                ref={(n) => this.node = n}
                id={sectionInfo.name}
                className={containerClasses} 
                style={
                    {
                        minHeight: this.props.windowHeight,
                        paddingTop: rhythm(1)
                    }
                }
            >
                <div className={CSS['wrapper']}> 
                    <TextBubble text={bubbleText} visible={this.state.active}></TextBubble>
                    <div 
                        className={CSS['content']}
                        style={
                            { paddingBottom: rhythm(1) }
                        }
                    >
                        <WrappedComponent {...this.props} {...this.state}/>
                    </div>
                </div>
            </section>
        )
    }
}