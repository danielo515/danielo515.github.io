import React from 'react'
import { Link } from 'react-router'
import { prefixLink } from 'gatsby-helpers'
import Headroom from 'react-headroom'
import { Container } from 'react-responsive-grid' 
import '../../css/project-styles.css'
import '../../css/fonts.css'
import { rhythm } from '../../utils/typography'


import ProjectHeader from '../../components/ProjectHeader'
import ScreenshotsGallery from '../../components/ScreenshotsGallery'
import MdSidebar from '../../components/MdSidebar'


module.exports = React.createClass({
  propTypes () {
    return {
      children: React.PropTypes.any,
    }
  },

  render () {
    console.log(this.props.children);
    const post = this.props.children.props.route.page.data;
    return (
      <section>
      <Headroom>
        <MdSidebar sections={post.sections} extraSections={{slug: 'gallery', title:'Gallery'}}/>
      </Headroom>
      <Container style={{padding:'1em'}}>
        <ProjectHeader info={post}/>

         { this.props.children }
         
         <ScreenshotsGallery  info={post}/>
      </Container>
      </section>
    )
  },
})
