import React, {PropTypes} from 'react'
import Css from './sidebar.module'


import Danielo from './Danielo';
import BreadCumbs from './Breadcumbs'
import {scrollTo} from '../utils/domUtils'


export default class Sidebar extends React.Component {

    static propTypes = {
            sections: PropTypes.object
    }

    constructor(props){
        super(props);
        this.state = {
            danieloExpanded: true,
            breadcumbsExpanded: false
        }
    }

    expand(){
        this.setState({ danieloExpanded: true, expanded: true, breadcumbsExpanded: false });
        // setTimeout(() => this.setState({breadcumbsExpanded: false}),1000)
    }

    collapse(){
        this.setState({ danieloExpanded: false, expanded: false });
        setTimeout(() => this.setState({breadcumbsExpanded: true}),1000)
    }

    render() {

        const {danieloExpanded, breadcumbsExpanded, expanded} = this.state;
        const {sections} = this.props;

        const sidebarStyles = {
            className: `${Css.wrapper} ${expanded ? Css.expanded : Css.collapsed}`
        }

        return (
            <div {...sidebarStyles}>
                <Danielo expanded={danieloExpanded}></Danielo>
                <BreadCumbs expanded={breadcumbsExpanded}
                    classNames={{wrapper: Css.breadcumbs, controls: Css.controls}}
                    sections={[
                        sections.webapps, 
                        sections.videogames, 
                        sections.curriculum]} 
                    onClick={scrollTo}
                 />
            </div>
        )
    }
}