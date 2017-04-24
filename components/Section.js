import React from 'react'
import ReactDOM from 'react-dom'
import CSS from './section.module'
import { rhythm } from '../utils/typography'


import TextBubble from './TextBubble'
import ScreenshotCard from './ScreenshotCard'
import { isActiveSection } from '../utils/domUtils'

export default class Section extends React.Component {

    static propTypes = {

        children: React.PropTypes.any,
        windowWidth: React.PropTypes.number

    }

    constructor(props) {
        super(props)
        this.state = {
            visible: false
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
        if (isActiveSection(this.elementBox, this.elementHeight)) {
            //   Navigator.setURL(this.props.section_name || this.props.parentName)
            if (!this.state.visible) this.setState({ visible: true });
        } else {
            if (this.state.visible) this.setState({ visible: false })
        }
    }

    render() {

        const containerClasses = `${CSS['container']} ${this.props.even ? CSS['even'] : CSS['odd']}`;
        const sectionInfo = this.props.sections[this.props.name];
        const bubbleText = sectionInfo.bubble[this.props.language];
        const cards = sectionInfo.projects.map(i => {
            return <ScreenshotCard key={i.data.name} cardInfo={i} />
        });

        return (
            <section // container
                ref={(n) => this.node = n}
                id={this.props.name}
                className={containerClasses}
                style={
                    {
                        minHeight: this.props.windowHeight,
                        paddingTop: rhythm(1)
                    }
                }
            >
                <div className={CSS['wrapper']}>
                    <TextBubble text={bubbleText} visible={this.state.visible}></TextBubble>
                    <div
                        className={CSS['content']}
                        style={
                            { paddingBottom: rhythm(1) }
                        }
                    >
                        {cards}
                    </div>
                </div>
            </section>
        )
    }
}