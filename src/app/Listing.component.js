import React from 'react';

import { getInstance } from 'd2/lib/d2';
import OrgUnitTree from 'd2-ui/lib/org-unit-tree/OrgUnitTree.component';


import Paper from 'material-ui/lib/paper';
import FontIcon from 'material-ui/lib/font-icon';
import RaisedButton from 'material-ui/lib/raised-button';
import IconButton from 'material-ui/lib/icon-button';
import Snackbar from 'material-ui/lib/snackbar';
import {Table, TableBody, TableHeader, TableHeaderColumn, TableRow, TableRowColumn} from 'material-ui/lib/table';
import CircularProgress from 'material-ui/lib/circular-progress';

import SelectField from 'material-ui/lib/select-field';
import MenuItem from 'material-ui/lib/menus/menu-item';
import Checkbox from 'material-ui/lib/checkbox';
import TextField from 'material-ui/lib/text-field';
import TextFieldLabel from 'material-ui/lib/text-field';
import Slider from 'material-ui/lib/slider';
import {green500, red500} from 'material-ui/lib/styles/colors';

import AppTheme from '../colortheme';
import HelpDialog from './HelpDialog.component';
import actions from '../actions';

const help = {
  help:(
    <div>
      <p>
        This app provides a convenient interface to audit user accounts within your DHIS2 application.
      </p>
      <h1>Listing</h1>
      <p>
      Simple tool to list users with certain audit parameters to facilitate better user management.
      </p>
      <p>
        Features:
      </p>
      <ul style={{listStyle: 'none'}}>
        <li>Listing users who have logged in the past X days</li>
        <li>Listing users who have not logged in the past X days</li>
      </ul>
    </div>
  ),
}

// TODO: Rewrite as ES6 class
/* eslint-disable react/prefer-es6-class */
export default React.createClass({

    propTypes: {
        d2: React.PropTypes.object,
        groups: React.PropTypes.object.isRequired,
        ouRoot: React.PropTypes.object.isRequired,
    },

    contextTypes: {
        d2: React.PropTypes.object,
    },

    getInitialState() {
        return {
          type:'stale',       // stale (longer than X days), fresh (within past X days)
          days:90,            // # days
          data:[],            // resulting user list
          filterBy:'none',    // none, group, ou
          filterUsername:'',  // for finding a particular person
          filter:null,
          filterDisabled:false, // hide disabled users
//          invertFilter:false, // select everyone not in the given params
          ouRoot:null,        // top of the OU tree, needed for OrgUnitTree
          userGroups:{},      // all user groups, needed for filter
          searchChildOUs:false,
          orgChildren:[],     // the children of the selected OU
          urlPath:'',         // server path, needed for user edit link
          processing:false,
          errors:'',
          pager:{page:0,pageCount:0,pageSize:0,total:0},
        };
    },

    //make sure we have our necessary select box data
    componentDidMount() {
      //get the base URL for the DHIS install for spooky action at a distance.
      let href = window.location.href;
      //on a app the system path starts with /api so chop off everything from there
      if (href.indexOf('/api/')!==-1){
        href = href.slice(0,href.indexOf('/api/'));
      }
      this.setState({
        urlPath:href,
        userGroups:this.props.groups,
        ouRoot:this.props.ouRoot
      });
    },

    //group and OU root data from App.js
    componentWillReceiveProps(nextProps) {
      this.setState({
        userGroups:nextProps.groups,
        ouRoot:nextProps.ouRoot
      });
    },

    //switch the type of search
    handleTypeChange(event, index, value){
      this.setState({type:value});
    },

    //update how they want to filter the data
    handleFilterChange(event, index, value){
      this.setState({filter:null,filterBy:value});
    },

    //they want to look up a particular person
    handleUserChange(event){
      this.setState({filterUsername:event.target.value});
    },

    //they changed the number of days
    handleLengthChange(event, index, value){
      this.setState({days:index});
    },

    handleFilterDisabled(event, value){
      this.setState({filterDisabled:value});
    },

    //Clicking on the org tree
    async handleSelectedOrgUnit(event, model) {
      if (this.state.ouRoot.id===model.id){
        return;
      }
      this.setState({
          filter: (model.id === this.state.filter)?null:model.id,
      });
      if (this.state.searchChildOUs===true){
        this.setState({processing:true});
        let children = await this.getOrgChildren(model.id);
        this.setState({orgChildren:children,processing:false});
      }
    },

    handleFilterChildOUs(event,value) {
      this.setState({searchChildOUs:value});
      actions.showSnackbarMessage("Depending on the tree depth this may be slow. Wait a moment.");
      if (value===true && this.state.ouRoot.id!==this.state.filter && this.state.filter!==null){
        this.setState({processing:true});
        this.getOrgChildren(this.state.filter).then(children=>{
          this.setState({orgChildren:children,processing:false});
        });
      }
    },

    //recursively find all children of id. return array of IDs
    async getOrgChildren(id) {
      const d2 = this.props.d2;
      let nodes = [id];
      let m = await d2.models.organisationUnits.get(id);
      if (m.id===id){
        if (m.hasOwnProperty('children') && m.children !== undefined){
          if (m.children.size===0){
            return nodes;
          }
          for (let child of m.children){
            let c = await this.getOrgChildren(child[0]);
            nodes = nodes.concat(c);
          }
          return nodes;
        }
        else{   //other way to get no children
          return nodes;
        }
      }
      return nodes;
    },

    //Clicking on the org tree
    handleGroupChange(event, index, value) {
      this.setState({
          filter: value,
      });
    },

    //Toggling of user access
    handleDisableUser(user) {
      const d2 = this.props.d2;
      const api = d2.Api.getApi();

      let data = {
        username:user.userCredentials.username,
      };
      if (user.userCredentials.disabled===true){  //toggle to enable
        data.enable=true;
      }
      //send the enable/disable request
      api.jquery
        .ajax({
          type: 'POST',
          url: this.state.urlPath+'/dhis-web-maintenance-user/disableUser.action',
          data: data
        })
        .done((res, textStatus, xhr)=>{
          //Worked! Update the UI
          if (xhr.status===200 && xhr.statusText==='OK'){
            user.userCredentials.disabled = !user.userCredentials.disabled;
            let users = this.state.data;
            for (let i in users){
              if (users[i].id === user.id){
                console.log('found');
                users[i].userCredentials.disabled = user.userCredentials.disabled;
                actions.showSnackbarMessage("User ''"+user.userCredentials.username+"' updated'");
                break;
              }
            }
            this.setState({data:users});
          }
        })
        .fail(err=>{
          this.setState({errors:err});
        })
        .always(()=>{

        });
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

    //The search button was pressed
    process(){
      const d2 = this.props.d2;
      const api = d2.Api.getApi();
      this.setState({processing:true,data:[]});

      //figure out the lastLoginDate as an actual Date
      var lastLoginDate = new Date();
      lastLoginDate.setDate(lastLoginDate.getDate() - this.state.days);

      let search = {
        fields:'*',
        pageSize:50,
      };
      if (this.state.type==='fresh'){
        search.lastLogin=lastLoginDate.toISOString().substr(0,10);
      }
      else if (this.state.type==='stale'){
        search.inactiveSince=lastLoginDate.toISOString().substr(0,10);
      }
      if (this.state.filterBy==='ou' && this.state.filter!==false){
          search.ou=this.state.filter;
      }
      if (this.state.filterBy==='group' && this.state.filter!==false){
          search.filter=['userGroups.id:eq:'+this.state.filter];
      }
      if (this.state.filterUsername!==''){
          search.query=this.state.filterUsername;
      }

      if (this.state.filterBy==='ou' && this.state.searchChildOUs===true){
        //get the ou children first
        this.getOrgChildren(this.state.filter).then(children=>{
          //need to issue multiple queries to get all the children OUs
          this.getMultiOrgUsers(search,children)
            .then(res=>{
              this.setState({
                data:res.data,
                pager:res.pager,
                processing:false,
              });
            });
        });
      }
      else{
        api.get('users',search).then(promise=>{
          if (promise.hasOwnProperty('users')){
            this.setState({
              data:promise.users,
              pager:promise.pager,
              processing:false,
            });
          }
          else{
            this.setState({
              data:[],
              processing:false,
            })
          }
        })
        .catch(error=> {
          this.setState({processing:false,errors:error});
        });
      }

    },

    async getMultiOrgUsers(search,ous) {
      const d2 = this.props.d2;
      const api = d2.Api.getApi();
      let users = [];
      let pager = {page:0,pageCount:0,total:0,pageSize:0};
      for (let ou of ous){
        search.ou=ou;
        let s = await api.get('users',search);
        if (s.hasOwnProperty('users')){
          users = users.concat(s.users);
          pager.total = s.pager.total + pager.total;
        }
      }
      return {data:users,pager:pager};
    },

    render() {
        const d2 = this.props.d2;

        let users = this.state.data.map( (row) => {
          //Do some filtering...
          if (this.state.filterBy==='group'){
            let found = false;
            for (let g of row.userGroups){
              if (g.id === this.state.filter){
                found = true;
              }
            }
            if (found === false){
              return null;
            }
          }
          else if (this.state.filterBy==='ou'){
            let found = false;
            for (let g of row.organisationUnits){
              if (g.id === this.state.filter){
                found = true;
              }
              //child OUs
              if (this.state.searchChildOUs===true && this.state.orgChildren.indexOf(g.id)>=0){
                found = true;
              }
            }
            if (found === false){
              return null;
            }
          }
          //hide disabled records
          if (this.state.filterDisabled===true && row.userCredentials.disabled===true){
            return null;
          }

          //Filters done, display records
          return (
          <TableRow key={row.id} selectable={false}>
            <TableRowColumn>{row.displayName}</TableRowColumn>
            <TableRowColumn>{row.userCredentials.username}</TableRowColumn>
            <TableRowColumn>{row.email}</TableRowColumn>
            <TableRowColumn>
              <IconButton id={row.id} tooltip={(row.userCredentials.disabled===false)?"Disable":"Enable"}
                onTouchTap={this.handleDisableUser.bind(this,row)}>
                {(row.userCredentials.disabled===false)?
                  <FontIcon className="material-icons">check</FontIcon>:
                  <FontIcon className="material-icons">block</FontIcon>
                }
              </IconButton>
            </TableRowColumn>
            <TableRowColumn>{row.userCredentials.lastLogin}</TableRowColumn><TableRowColumn>{row.userCredentials.passwordLastUpdated}</TableRowColumn>
          </TableRow>
        )});

        return (
            <div className="wrapper">
              <HelpDialog style={{float:"right"}} title={"App Help"} content={help.help} />

              <Paper className='paper' style={{'minWidth':'800px'}}>
                <h3 className="subdued title_description">{d2.i18n.getTranslation('app_listing')}</h3>

                <div style={{'width':'40%','float':'left'}}>
                  <SelectField  value={this.state.type}
                                onChange={this.handleTypeChange}
                                autoWidth={true}
                                floatingLabelText='Find Users who '
                                maxHeight={200}
                                style={{'float':'left'}}>
                    <MenuItem value='fresh' key='fresh' label='Have' primaryText='Have' />
                    <MenuItem value='stale' key='stale' label='Have Not' primaryText='Have Not'/>
                  </SelectField>

                  <div style={{'float':'left','clear':'both','width':'70%'}} >
                    <span style={{'float':'left',fontSize:'small',color:'grey'}}>Logged in the past&nbsp;
                      <span style={{fontSize:'normal',fontWeight:'bold',color:'black'}}>{this.state.days}</span> days</span>
                    <Slider
                        step={1}
                        value={this.state.days}
                        defaultValue={30}
                        min={1}
                        max={180}
                        autoWidth={true}
                        onChange={this.handleLengthChange}
                        style={{marginBottom:'0px'}}
                        />
                      <TextField hintText="Name"
                      floatingLabelText="With name containing"
                      floatingLabelFixed={true}
                      value={this.state.filterUsername}
                      onChange={this.handleUserChange} />
                  </div>
                </div>

                <div style={{'width':'40%','float':'left'}}>
                  <SelectField  value={this.state.filterBy}
                                onChange={this.handleFilterChange}
                                floatingLabelText='Filter By'
                                maxHeight={200}
                                autoWidth={true}
                                style={{'float':'left'}}>
                    <MenuItem value='none' key='none' primaryText='-' />
                    <MenuItem value='group' key='group' primaryText='User Group' />
                    <MenuItem value='ou' key='ou' primaryText='Organizational Unit' />
                  </SelectField>
                  <div style={{'clear':'both'}}>
                    {this.getOUTree()}
                    {this.getUserGroups()}
                  </div>
                </div>

                <div style={{'width':'19%','float':'left'}}>

                  <Checkbox label="Hide Disabled"
                        checked={this.state.filterDisabled}
                        onCheck={this.handleFilterDisabled}
                        labelStyle={{color:'grey',fontSize:'small'}}/>
                  <Checkbox label="Include Child OUs"
                        checked={this.state.searchChildOUs}
                        onCheck={this.handleFilterChildOUs}
                        disabled={this.state.filterBy!='ou' || this.state.ouRoot.id===this.state.filter}
                        labelStyle={{color:'grey',fontSize:'small'}}/>

                </div>
                <div>
                  <RaisedButton
                    label="Search"
                    labelPosition="before"
                    primary={true}
                    disabled={this.state.processing}
                    onClick={this.process}
                    icon={<FontIcon className="material-icons">search</FontIcon>}
                    style={{'clear':'both','float':'left'}}
                  />
                  {(this.state.processing===true)?<CircularProgress />:null}
                </div>

                <div style={{marginTop:'10em',marginLeft:'25em'}}>
                  Total Records: {this.state.pager.total}<br/>
                  Loaded: {this.state.data.length} <br/>
                </div>
              </Paper>

              <Paper className="paper" style={{'float':'left','clear':'both'}}>


                <Table selectable={false}>
                  <TableHeader displaySelectAll={false} adjustForCheckbox={false}>
                    <TableRow selectable={false}>
                      <TableHeaderColumn>
                        Name
                      </TableHeaderColumn>
                      <TableHeaderColumn>
                        UserName
                      </TableHeaderColumn>
                      <TableHeaderColumn>
                        Email
                      </TableHeaderColumn>
                      <TableHeaderColumn>
                        Active
                      </TableHeaderColumn>
                      <TableHeaderColumn>
                        Last Login
                      </TableHeaderColumn>
                      <TableHeaderColumn>
                        Password Updated
                      </TableHeaderColumn>
                    </TableRow>
                  </TableHeader>
                  <TableBody
                            displayRowCheckbox={false}
                            showRowHover={true}
                            stripedRows={true}
                          >
                            {users}
                  </TableBody>
                </Table>
                {(this.state.processing===true)?<CircularProgress />:null}
              </Paper>

              <Paper className='paper'>
              <ul>
                <li>errors:{this.state.errors}</li>
              </ul>
              </Paper>

          </div>
        );
    },
});
