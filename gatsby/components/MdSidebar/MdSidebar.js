import React, {PropTypes} from 'react';
import Css from './styles.module';

import Icon from '../Icon'
import {scrollTo} from '../../utils/domUtils'

export default class MdSidebar extends React.Component {

  static propTypes = {
    sections: PropTypes.array,
    extraSections: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
    backTo: PropTypes.string
  }

  static defaultProps = {
    sections: [], 
    extraSections: [],
    backTo:'/'
  }

  navigate(id){
    return (e) => {
      e.preventDefault();
      scrollTo(id);
    }
  }

  render() {

    const extraSections = Array.isArray(this.props.extraSections) 
    ? this.props.extraSections 
    : [this.props.extraSections];

    const totalSections = this.props.sections.concat(extraSections);
    const numberOfSections = totalSections.length -1;
    const sections = totalSections.map(( s, i )=>{
      return (
        <div 
             key={s.slug} 
             className={`${Css.linkWrapper} ${ i === numberOfSections ? Css.lastLink : ''}`}
        >
          <a  href={'#' + s.slug} onClick={this.navigate(s.slug)}>{s.title}</a>
        </div>
        )
    });

    return (
      <div className={Css.wrapper}>
        <div className={Css.content}>
        <div className={Css.controls}>
          <Icon linkTo={this.props.backTo} name='backspace' classes={[Css.back]}>
            <span className={Css.backText}>Back</span>
          </Icon>
        </div>
          {sections}
        </div>
      </div>
    )
  }
}