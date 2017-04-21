import React, {PropTypes} from 'react'
import Css from './breadcumbs.module.scss'
import { rhythm } from '../utils/typography'
import Icon from './icon'


export default class BreadCumbs extends React.Component {

    static propTypes() {
        return {
            sections: PropTypes.array,
            onClick: PropTypes.func // This function will be called with the name of the section clicked
        }
    }

    constructor (props) {
        super(props);
        this.state = { activeSection: '' }
        this.sectionNames = this.props.sections.map( s => s.name);
    }

    activateSection(name){
        if( this.state.activeSection === name){ return }
        if( this.sectionNames.indexOf(name)<0){ return console.error('Non existing section'); }
        this.setState({activeSection: name})
    }

    render(){

        const controls = this.props.sections.map(
            (section) => ( 
                <button key={section.name} 
                  onClick={() => { this.activateSection(section.name); this.props.onClick(section.name)}}>
                    <span className={`icon-${section.icon}`}></span>
                </button>)
        );

        return (
            <div className={Css['wrapper']}>
                <span className={Css['controls']}>
                    {controls}
                </span>
            </div>
        )
    }

}