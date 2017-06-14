import React from 'react';

import { getInstance } from 'd2/lib/d2';
import OrgUnitTree from 'd2-ui/lib/org-unit-tree/OrgUnitTree.component';

import FontIcon from 'material-ui/lib/font-icon';
import CircularProgress from 'material-ui/lib/circular-progress';

import SelectField from 'material-ui/lib/select-field';
import MenuItem from 'material-ui/lib/menus/menu-item';
import TextField from 'material-ui/lib/text-field';
import TextFieldLabel from 'material-ui/lib/text-field';

import AppTheme from '../colortheme';

// TODO: Rewrite as ES6 class
/* eslint-disable react/prefer-es6-class */
export default React.createClass({

    propTypes: {
        d2: React.PropTypes.object,
        groups: React.PropTypes.object.isRequired,
        //ouRoot: React.PropTypes.object.isRequired,
        onFilterChange: React.PropTypes.func.isRequired,
    },

    contextTypes: {
        d2: React.PropTypes.object,
    },

    getInitialState() {
        return {
          filterBy:'none',    // none, group, ou
          filter:null,
          ouRoot:null,        // top of the OU tree, needed for OrgUnitTree
          userGroups:{},      // all user groups, needed for filter
        };
    },

    //make sure we have our necessary select box data
    componentDidMount() {
      let our = null;
      if (this.props.hasOwnProperty('ouRoot')){
        our = this.props.ouRoot;
      }
      this.setState({
        userGroups:this.props.groups,
        ouRoot:our
      });
    },

    //group and OU root data from App.js
    componentWillReceiveProps(nextProps) {
      let our = null;
      if (nextProps.hasOwnProperty('ouRoot')){
        our = nextProps.ouRoot;
      }
      this.setState({
        userGroups:nextProps.groups,
        ouRoot:our
      });
    },

    //update how they want to filter the data
    handleFilterChange(event, index, value){
      this.setState({filter:null,filterBy:value});
      this.props.onFilterChange(value,null);
    },

    //Clicking on the org tree
    handleSelectedOrgUnit(event, model) {
      if (this.state.ouRoot.id===model.id){
        return;
      }
      this.setState({
          filter: (model.id === this.state.filter)?null:model.id,
      });
      this.props.onFilterChange(this.state.filterBy,(model.id === this.state.filter)?null:model.id);
    },

    //Clicking on the org tree
    handleGroupChange(event, index, value) {
      this.setState({
          filter: value,
      });
      this.props.onFilterChange(this.state.filterBy,value);
    },

    //Show the OU tree if that is the current filter
    getOUTree(){
      if (this.state.filterBy === 'ou'){
          return (
            <OrgUnitTree
              root={this.state.ouRoot}
              onClick={this.handleSelectedOrgUnit}
              selected={[this.state.filter]}
              selectedLabelStyle={{fontWeight:'bold'}}
            />
          );
      }
      return null;
    },

    //Show the available User groups
    getUserGroups(){
      if (this.state.filterBy === 'group'){
        let groups = [];
        for (let i of Object.keys(this.state.userGroups)){
          groups.push(<MenuItem value={this.state.userGroups[i].id} key={i} primaryText={this.state.userGroups[i].displayName} />);
        }
        return (
          <SelectField
            floatingLabelText="Group"
            value={this.state.filter}
            onChange={this.handleGroupChange}
          >
          {groups}
        </SelectField>
        );
      }
      return null;
    },

    render() {
        return (
          <div>
            <SelectField  value={this.state.filterBy}
                          onChange={this.handleFilterChange}
                          floatingLabelText='Select Type'
                          maxHeight={200}
                          autoWidth={true}
                          style={{'float':'left'}}>
              <MenuItem value='none' key='none' primaryText='-' />
              <MenuItem value='group' key='group' primaryText='User Group' />
              {this.props.ouRoot!=null?(
                <MenuItem value='ou' key='ou' primaryText='Organizational Unit' />
              ):<span/>}
            </SelectField>
            <div style={{'clear':'both'}}>
              {this.getOUTree()}
              {this.getUserGroups()}
            </div>
          </div>
        );
    },
});
