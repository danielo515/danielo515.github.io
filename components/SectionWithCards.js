import React, { PropTypes } from 'react'
import ReactDOM from 'react-dom'
import Css from './sectionwithcards.module.scss'

import Section from './Section.hoc'
import ScreenshotCard from './ScreenshotCard'

export default Section((props) => {

    const cards = props.sectionInfo.projects.map(i => {
        return <ScreenshotCard key={i.data.name} cardInfo={i} />
    });

    return (
        <div className={Css['cards']}>
            {cards}
        </div>
    );
});