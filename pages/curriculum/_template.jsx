import React from 'react'
import { Container } from 'react-responsive-grid'
import { Link } from 'react-router'
import { prefixLink } from 'gatsby-helpers'
import Headroom from 'react-headroom'

import Curriculum from '../../components/Curriculum';

module.exports = React.createClass({
  propTypes () {
    return {
      children: React.PropTypes.any,
    }
  },
  render () {
    return (
        <Curriculum history={this.props.history}>
         { this.props.children }
        </Curriculum>
    )
  },
})
