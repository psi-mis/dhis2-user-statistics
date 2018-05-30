import React from 'react';

import { getInstance } from 'd2/lib/d2';
import OrgUnitTree from 'd2-ui/lib/org-unit-tree/OrgUnitTree.component';

import SelectField from 'material-ui/SelectField';
import MenuItem from 'material-ui/MenuItem';
import FilterGroup from './Filter.UserGroup.component.js';

// TODO: Rewrite as ES6 class
/* eslint-disable react/prefer-es6-class */
export default React.createClass({

    propTypes: {
        d2: React.PropTypes.object,
        groups: React.PropTypes.object.isRequired,
        ouRoot: React.PropTypes.object.isRequired,
        onFilterChange: React.PropTypes.func.isRequired,
        //disabledFilter: React.PropTypes.func.isRequired,

    },

    contextTypes: {
        d2: React.PropTypes.object,
    },

    getInitialState() {
        return {
          filterBy:'none', 
          filter:null,   // none, group, ou
          selected:[],
          ouRoot:null,        // top of the OU tree, needed for OrgUnitTree
          userGroups:{},      // all user groups, needed for filter
          disabledFilter:true,
          userGroupsFiltered: {},
          processing:false,
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
        ouRoot:our,
        disabledFilter:this.props.disabledFilter
      });
    },

    //group and OU root data from App.js
    componentWillReceiveProps(nextProps) {
      let our = null;
      if (nextProps.hasOwnProperty('ouRoot')){
        our = nextProps.ouRoot;
      }
      this.setState({
        filterBy:nextProps.value,
        userGroups:nextProps.groups,
        ouRoot:our,
        disabledFilter:nextProps.disabledFilter
      });
    },
    clearAllSelected(){
      this.setState({userGroupsFiltered:{}});
      this.props.onFilterChange('none',null);
    },
    //update how they want to filter the data
    handleFilterChange(event, index, value){
      this.setState({selected:[],filterBy:value});
      this.props.onFilterChange(value,null);
    },
    handleFilterChangeGroups(filterby, value){
        this.props.onFilterChange(filterby, value);
    },

    //Clicking on the org tree
    handleSelectedOrgUnitAnt(event, model) {
      if (this.state.ouRoot.id===model.id){
        return;
      }
      this.setState({
          filter: [(model.id === this.state.filter[0])?[]:model.path],
      });
      this.props.onFilterChange(this.state.filterBy,(model.id === this.state.filter)?null:model.id);
    },

    handleSelectedOrgUnit(event, orgUnit) {
      this.setState(state => {
          if (state.selected[0] === orgUnit.path) {
              return { selected: [] };
          }

          return { selected: [orgUnit.path] };
      });
      this.props.onFilterChange(this.state.filterBy,(orgUnit.id === this.state.selected[0])?null:orgUnit.id);

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
              onSelectClick={this.handleSelectedOrgUnit}
              selected={this.state.selected}
              hideCheckboxes
            />
          );
      }
      return null;
    },

    //Show the available User groups
    getUserGroups(){
      if (this.state.filterBy === 'group'){
        return (
          <FilterGroup value={this.state.filterBy}
          onFilterChange={this.handleFilterChangeGroups}
          groups={this.props.groups}
          groupsfiltered={this.state.userGroupsFiltered}
          disabled={this.state.processing}
          clearSelected={this.clearAllSelected}
        />
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
                          style={{'float':'left'}}
                          disabled={this.state.disabledFilter}>
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
