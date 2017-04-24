import React from 'react';
import Css from './styles';

export default class npmPkgCard extends React.Component {
  static propTypes = {

  }
  render() {

    const { badges } = this.props;
    return (
      <div>
        <div dangerouslySetInnerHTML={{ __html: badges }}></div>
      </div>
    );
  }
}