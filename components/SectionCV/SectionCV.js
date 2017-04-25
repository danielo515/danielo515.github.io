import React, {PropTypes} from 'react';
import Css from './styles.module';

import Section from '../Section.hoc'
import Icon from '../Icon'

const Content = Section((props)=>{

  const {sectionInfo:{text, skills}, language} = props;
  const {description, gotoText} = text[language];

  return (
    <div className={Css.content}>
      <p>
       { skills.map( s => <span className={`icon-${s} ${Css.iconWrapper}`} key={s} />)}
      </p>
      <p>
        {description}
      </p>

      <p>
        {gotoText}
      </p>
      <Icon name='drivers-license' linkTo='curriculum' wrapperClasses={[Css.cvLink]}/>
    </div>
)
});

const SectionCV = (props) => (
  <Content {...props} className={Css.section} suppressBubble={false}></Content>
);

SectionCV.displayName = 'SectionCV';

export default SectionCV;