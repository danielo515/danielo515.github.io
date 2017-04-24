import React from 'react';
import Css from './styles.module';

import Section from '../../Section.hoc';

import NpmPkgCard from '../npmPkgCard';

export default Section((props) => {

  const cards = props.sectionInfo.projects.map( ({data}) => <NpmPkgCard {...data} key={data.name}></NpmPkgCard> );
    return (
      <div>
        {cards}
      </div>
    )
  }
);