import React, {PropTypes} from 'react'
import Css from './styles.module'
import Icon from '../Icon'


export default class BreadCumbs extends React.Component {

    static propTypes = {
            sections: PropTypes.array,
            onClick: PropTypes.func, // This function will be called with the name of the section clicked,
            classNames: PropTypes.object
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

        const Item = this.props.layout === 'horizontal' ? 'span' : 'div'; // Allow vertical and horizontal layouts. Defaults to vertical
        const controls = this.props.sections.map(
            (section) => (
                <Item  key={section.name} >
                    <button
                        onClick={() => { this.activateSection(section.name); this.props.onClick(section.name)}}
                    >
                        <span className={`icon-${section.icon}`}></span>
                    </button>
                </Item>
                )
        );

        const expanded = this.props.expanded;
        const classNames = this.props.classNames || {};
        
        const wrapperClasses = [Css['wrapper'], expanded ? Css.expanded : Css.collapsed , classNames.wrapper].join(' ');
        const controlClasses = [Css['controls'], classNames.controls].join(' ');
        
        return (
            <div className={wrapperClasses}>
                <div className={controlClasses}>
                    {controls}
                </div>
            </div>
        )
    }

}