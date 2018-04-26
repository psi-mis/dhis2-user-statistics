import React from 'react';

import { getInstance } from 'd2/lib/d2';
import FontIcon from 'material-ui/lib/font-icon';
import CircularProgress from 'material-ui/lib/circular-progress';
import TextField from 'material-ui/lib/text-field';
import FlatButton from 'material-ui/lib/flat-button';
import {List, ListItem} from 'material-ui/lib/lists';
import Checkbox from 'material-ui/lib/checkbox';

import AppTheme from '../colortheme';

// TODO: Rewrite as ES6 class
/* eslint-disable react/prefer-es6-class */
export default React.createClass({

    propTypes: {
        d2: React.PropTypes.object,
        groups: React.PropTypes.object.isRequired,
        onFilterChange: React.PropTypes.func.isRequired,
        groupsfiltered:React.PropTypes.object,
        disabled:React.PropTypes.bool,
        clearSelected:React.PropTypes.func.isRequired,

    },

    contextTypes: {
        d2: React.PropTypes.object,
    },

    getInitialState() {
        return {
          filterBy:'group',    // none, group, ou
          filter:null,
          userGroups:{},      // all user groups, needed for filter
          disabledFilter:true,
          checkedValues:[],
          loadFilter:true,
          filterName:""
        };
    },

    //make sure we have our necessary select box data
    componentDidMount() {
        this.setState({
         userGroups:this.props.groups,
         disabledFilter:this.props.disabledFilter
      });
      if(this.state.loadFilter){
        this.checkGrupPreselected(this.props.groupsfiltered);
        this.state.loadFilter=false;
      }
        
    },

    //group and OU root data from App.js
    componentWillReceiveProps(nextProps) {
 
    },

    //check
    checkbutton(id){
      this.setState(state => ({
        checkedValues: state.checkedValues.includes(id)
          ? state.checkedValues.filter(c => c !== id)
          : [...state.checkedValues, id]
      }));
    },
    
    //check group preloaded
    checkGrupPreselected(groupSelected){
      for (let i in groupSelected){
        this.checkbutton(groupSelected[i].id);
      }
    },
    
    //Clicking on the org tree
    handleGroupChange(id) {
      this.checkbutton(id);
      this.setState({filterBy:'group'});
      this.props.onFilterChange(this.state.filterBy,id);
    },

    //Show the available User groups
    getUserGroups(){
      let groups = [];
      for (let i of Object.keys(this.state.userGroups)){
        if(this.state.filterName=== '' || this.state.userGroups[i].displayName.includes(this.state.filterName)){
          groups.push(<ListItem key={i} primaryText={this.state.userGroups[i].displayName} leftCheckbox={<Checkbox disabled={this.props.disabled} checked={this.state.checkedValues.includes(this.state.userGroups[i].id)} onCheck={()=>this.handleGroupChange(this.state.userGroups[i].id)} />} /> );
        }
      }
      return (
        <List>
        {groups}
       </List> 
      );
    
    return null;
  },
    searchByName(event, newValue){
      console.log(event.target.value);
      this.setState({filterName:event.target.value})      
    },
    clearAllChecked(){
      this.setState({checkedValues:[]})
      this.props.clearSelected();
    },
    render() {
        return (
          <div>
            <TextField
                hintText="Write here the user group name"
                floatingLabelText="Seach by name"
                floatingLabelFixed={true}
                onChange={this.searchByName}
                value={this.state.filterName}
              />
              <FlatButton label="Clear all" primary={true} onClick={this.clearAllChecked} />
            <div style={{height:'280px',overflowY:'scroll'}}>
                {/* List of user groups whith checkbox */}
                {this.getUserGroups()}           
            </div>
           </div>
        );
    },
});
