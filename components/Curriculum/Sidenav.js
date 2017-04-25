import React from 'react';
import PropTypes from 'prop-types';
import Css from './sidenav.module';
import SideNav, { Nav, NavIcon, NavText } from 'react-sidenav';
import {Link} from 'react-router'

import {scrollTo} from '../../utils/domUtils'
import Icon from '../Icon'

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
            <SideNav hoverBgColor='#eeeeff' onItemSelection={scrollTo}>
                <div className={Css.avatar}>
                  <div> Danielo Rodriguez Rivero</div>
                  <img src='../danielo.png'></img>
                </div>
                <div className={Css.separator}></div>
                {sections}
            </SideNav>
            <SideNav hoverBgColor='#eeeeff' onItemSelection={() => this.props.history.push('/')}>
                  <Nav id='back'>
                  <NavIcon><Icon name='backspace'></Icon></NavIcon>
                  <NavText>RETURN</NavText>
                </Nav>
                <div className={Css.separator}></div>
            </SideNav>
        </div>
      </div>
    )
  }
} 