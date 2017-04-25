import React from 'react';
import PropTypes from 'prop-types';
import Css from './sidenav.module';
import SideNav, { Nav, NavIcon, NavText } from 'react-sidenav';

import {scrollTo} from '../../utils/domUtils'

export default class CurriculumSidenav extends React.Component {

  static propTypes = {
    children: PropTypes.any,
    sections: PropTypes.array
  }

  render() {

    const sections = this.props.sections
    .filter(s => s.title.trim().match(/^[A-Z ]*$/)) // Only uppercase on the curriculum means main sections
    .map(( s, i )=>{
      return (
        <Nav key={s.slug} id={s.slug} >
          <NavText>{s.title}</NavText>
        </Nav>
        )
    });


    return (
      <div className={Css['wrapper']}>
        <div className={Css['content']}>
            <SideNav highlightBgColor='#00bcd4' defaultSelected='sales' onItemSelection={scrollTo}>
                <div className={Css.avatar}>
                  <img src='../danielo.png'></img>
                </div>
                {sections}
            </SideNav>
        </div>
      </div>
    )
  }
} 