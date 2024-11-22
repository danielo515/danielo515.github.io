import React from 'react'
import Styles from './presentation.module.scss'
import { rhythm } from '../../utils/typography'

import Icon from '../Icon'

class Presentation extends React.Component {
  
  static propTypes () {
    return {
      children: React.PropTypes.any,
      windowWidth: React.PropTypes.number,
      onRead: React.PropTypes.func,
      onUnread: React.PropTypes.func
    }
  }

  constructor(props){
      super(props);
      this.state = {
          isRead: false
      }
  }

  componentDidUpdate(){

      if( typeof this.props.onRead !== 'function') {
          return
      }

      // Reset the read state if we are at top of the page
      if( this.state.isRead && this.bottomNode.getBoundingClientRect().top > 0){
          this.setState({isRead: false});
          return ( this.props.onUnread && this.props.onUnread() );
      }
      // Set this section as read and call the onRead callback if the latest node is read already
      if( !this.state.isRead && this.bottomNode.getBoundingClientRect().top <= 0){
          this.setState({isRead: true});
          return this.props.onRead();
      }
  }

    render() {

        return (
            <div 
                ref={node => this.rootNode = node}
                className={Styles['presentation-container']}
                style={
                    {
                        minHeight: this.props.windowHeight,
                        paddingTop: rhythm(1)
                    }
                    }
            >
                <h1> { this.props.title } </h1>
                <div className={Styles['presentation-text-wrapper']}
                    style={
                        { paddingBottom: rhythm(1)}
                    }
                >
                    <p className={Styles['presentation-text']}>
                        {this.props.children}
                    </p>
                </div>
                <div className={Styles['presentation-icons']} ref={ node => this.bottomNode = node}>
                    <Icon size={4} padding={rhythm(1)} name="github-square" linkTo="https://github.com/danielo515"></Icon>
                    <Icon size={4} padding={rhythm(1)} name="linkedin-square" linkTo="https://linkedin.com/in/danielorodriguez"></Icon>
                    <Icon size={4} padding={rhythm(1)} name="stack-overflow" linkTo="https://stackoverflow.com/users/1734815/danielo515"></Icon>
                </div>
            </div>
            )
    }
}


export default Presentation;
