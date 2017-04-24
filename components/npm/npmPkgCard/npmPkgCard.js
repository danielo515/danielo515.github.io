import React, {PropTypes} from 'react';
import Css from './styles.module';

import Icon from '../../Icon'

export default class NpmPkgCard extends React.Component {
  
  static propTypes = {
    badges: PropTypes.string,
    description: PropTypes.arrayOf(PropTypes.string),
    url: PropTypes.string,
    name: PropTypes.string
  }
  render() {

    const { badge, description, url, name } = this.props;
    const desc = description.slice(0,2).join(' ').length > 300 ? description[0] : description.slice(0,2).join(' ');
    return (
      <div className={Css.card}>
        <h3>{name}</h3>
        <div dangerouslySetInnerHTML={{ __html: badge }}></div>
        <div> {desc} </div>
        <div> <Icon name='npm' linkTo={url}/></div>
      </div>
    );
  }
}