import React, {PropTypes} from 'react';
import Css from './styles.module';
import SideNav from './Sidenav'

import {scrollTo} from '../../utils/domUtils'

export default class Curriculum extends React.Component {

  static propTypes = {
    children: PropTypes.any
  }

  render() {

    const sections = this.props.children.props.route.page.data.sections;

    return (
      <div className={Css['wrapper']}>
        <SideNav sections={sections}></SideNav>
        <div className={Css['content']}>
          {this.props.children}
        </div>
      </div>
    )
  }
}