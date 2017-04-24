import React from 'react'
import { Link } from 'react-router'
import { prefixLink } from 'gatsby-helpers'
import Helmet from 'react-helmet'
import { config } from 'config'

import Presentation from '../components/Presentation'
import SectionWithCards from '../components/SectionWithCards'
import {scrollTo, scrollToTop} from '../utils/domUtils'
import BackToTop from '../components/BackToTop'
import Sidebar from '../components/Sidebar'

export default class Index extends React.Component {

  constructor(props) {
    super(props);

     this.sections = props.route.pages
      .reduce(
      (all, p) => {

        const dirname = p.file.dirname;
        const type = p.data.type;
        if(type === 'section-metadata'){
          all[p.data.name] = all[p.data.name] || {projects:[]};
          Object.assign(all[p.data.name], p.data)
          return all;
        }
        if (dirname) {
          all[dirname] = all[dirname] || {projects:[]};
          all[dirname].projects.push(p)
        }
        return all;
      }
      , {});

    console.log(this.sections);
    this.state = {
      language: 'en',
      windowWidth: 0,
      windowHeight: 0,
    }

    this.handleResize = this.handleResize.bind(this);
    this.handleScroll = this.handleScroll.bind(this);
  }

  // Viewport mechanism borrowed from https://medium.com/@michaelcereda/creating-an-isomorphic-universal-website-with-react-part-2-4d434cae67ea
  handleResize(e) {
    var newDimensions = {
      windowWidth: window && window.innerWidth,
    };

    if (window.isMobile) {
      newDimensions.windowHeight = this.state.windowHeight || (window && window.innerHeight)
    } else {
      newDimensions.windowHeight = (window && window.innerHeight);
    }

    this.setState(newDimensions);
  }

  handleScroll(e) {
    // if(this.state.scrollTop !== e.srcElement.body.scrollTop || this.state !== e.srcElement.body.scrollHeight )
      this.setState({
        scrollTop: e.srcElement.body.scrollTop,
        scrollHeight: e.srcElement.body.scrollHeight,
      });
  }

  componentDidMount() {
    // Navigator.goToHash(1000, ['home']);
    // window.isMobile = mobilecheck();

    this.setState({
      windowWidth: window && window.innerWidth,
      windowHeight: window && window.innerHeight,
    });
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('scroll', this.handleScroll);
  }



  componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('scroll', this.handleScroll);
  }

  render() {

    return (
      <div>
        <Helmet
          title={config.siteTitle}
          meta={[
            { "name": "description", "content": "Sample" },
            { "name": "keywords", "content": "sample, something" },
          ]}
        />
        <Presentation id='presentation' {...this.state} title='Hola' 
          onRead={() =>{
            this.sidebar && this.sidebar.collapse(); 
            scrollTo('webapps')}
          }
          onUnread={()=>{
            this.sidebar && this.sidebar.expand();
          }} 
        >
          Lorem Ipsum es simplemente el texto de relleno de las imprentas y archivos de texto. Lorem Ipsum ha sido el texto de relleno estándar de las industrias desde el año 1500, cuando un impresor (N. del T. persona que se dedica a la imprenta) desconocido usó una galería de textos y los mezcló de tal manera que logró hacer un libro de textos especimen.</Presentation>
        
        <SectionWithCards {...this.state} even={true} sectionInfo={this.sections.webapps}></SectionWithCards>
        <SectionWithCards {...this.state} sectionInfo={this.sections.videogames}></SectionWithCards>
        {/*<section className={Css['sidebar']}>
            <Danielo ref={(d)=> d ? this.danielo = d : null}/>
            <BreadCumbs sections={[
                this.sections.webapps, 
                this.sections.videogames, 
                this.sections.curriculum]} 
                onClick={scrollTo}/>
        </section> 
      */}
        <Sidebar sections={this.sections} ref={(n)=> n ? this.sidebar = n : null}/>
        <BackToTop {...this.state} onClick={scrollToTop}/>
      </div>
    )
  }
}
