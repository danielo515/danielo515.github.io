import React from 'react'
import { Link } from 'react-router'
import { prefixLink } from 'gatsby-helpers'
import Helmet from 'react-helmet'
import { config } from 'config'

import Presentation from '../components/Presentation'
import SectionWithCards from '../components/SectionWithCards'
import SectionCV from '../components/SectionCV'
import NpmSection from '../components/npm/NpmSection'
import { scrollTo, scrollToTop } from '../utils/domUtils'
import BackToTop from '../components/BackToTop'
import Sidebar from '../components/Sidebar'

export default class Index extends React.Component {

  constructor(props) {
    super(props);

    this.sections = props.route.pages
      .reduce(
      (all, p) => {

        const dirname = p.file.dirname.replace(/.*\//, '');
        const type = p.data.type;
        if (type === 'section-metadata') {
          all[p.data.name] = all[p.data.name] || { projects: [] };
          Object.assign(all[p.data.name], p.data)
          return all;
        }
        if (dirname) {
          all[dirname] = all[dirname] || { projects: [] };
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
        <Presentation id='presentation' {...this.state} title='Hello there!'
          onRead={() => {
            this.sidebar && this.sidebar.collapse();
            scrollTo('webapps')
          }
          }
          onUnread={() => {
            this.sidebar && this.sidebar.expand();
          }}
        >
          My  name is Daniel Rodríguez, but my friends call me Danielo. I'm a passionate developer, and JavaScript is my favorite language both on the client and the server side.
          I'm currently working as a backend javascript developer. I spent most of my free time learning how to get better at it or developing my personal projects, this page is a good example of that.
          I started programming as young as 12, when I spent almost all the money I had on a game programming engine called Div2 Games Studio. This is probably one of the main reasons why I like programming so much: it was very fun to HACK the example games to make them easier, or funnier or just chaotic. After reading thousands of lines of code I felt brave enough to start programming my own games, and that's where the real journey actually started.
          Embedded systems and small bots are fun too and I have spent a reasonable amount of time exploring both.
          I strongly trust on code quality, unit testing and automating as many things as possible.
          If you are ready to explore some of my projects and key skills, please scroll down and let me guide through them.
          </Presentation>

        <SectionWithCards {...this.state} sectionInfo={this.sections.webapps} even={true} />
        <SectionWithCards {...this.state} sectionInfo={this.sections.videogames} />
        <NpmSection {...this.state} sectionInfo={this.sections.npm} even={true} />
        <SectionCV {...this.state} sectionInfo={this.sections.curriculum} />
        {/*<section className={Css['sidebar']}>
            <Danielo ref={(d)=> d ? this.danielo = d : null}/>
            <BreadCumbs sections={[
                this.sections.webapps, 
                this.sections.videogames, 
                this.sections.curriculum]} 
                onClick={scrollTo}/>
        </section> 
      */}
        <Sidebar sections={this.sections} ref={(n) => n ? this.sidebar = n : null} />
        <BackToTop {...this.state} onClick={scrollToTop} />
      </div>
    )
  }
}
