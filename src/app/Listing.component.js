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

import AppTheme from '../colortheme';
import HelpDialog from './HelpDialog.component';
import actions from '../actions';


/**
sqlViews needed:

//app-AccountAuditTracking-stale
//Find logins later than a certain date. This mostly replicates existing DHIS2 functionality, but lets us see it in a prettier app interface.
//No cache
//sql query
select u.userid, u.username, u.lastlogin, u.disabled, u.created, u.passwordlastupdated, u.creatoruserid,
  ui.uid, ui.surname, ui.firstname, ui.email from users u
join userinfo ui on u.userid=ui.userinfoid
where u.lastlogin <= '${lastLoginDate}'
order by u.lastlogin

//app-AccountAuditTracking-fresh
//Finds accounts that have logged in recently.
//No cache
//sql query
select u.userid, u.username, u.lastlogin, u.disabled, u.created, u.passwordlastupdated, u.creatoruserid,
  ui.uid, ui.surname, ui.firstname, ui.email from users u
join userinfo ui on u.userid=ui.userinfoid
where u.lastlogin >= '${lastLoginDate}'
order by u.lastlogin



*/
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
    },

    contextTypes: {
        d2: React.PropTypes.object,
    },

    //make sure we have our necessary SQL Views
    componentDidMount() {
      const d2 = this.props.d2;
      const api = d2.Api.getApi();

      api.get('sqlViews').then(promise=>{
        let fresh = false;
        let stale = false;
        if (promise.hasOwnProperty('sqlViews')){
          let sqv = promise.sqlViews;
          for (let view of sqv){

            if (view.displayName==='app-AccountAuditTracking-fresh'){
              fresh = view.id;
            }
            if (view.displayName==='app-AccountAuditTracking-stale'){
              stale = view.id;
            }
          }
        }

        if (fresh === false){
          actions.showSnackbarMessage('Cannot find "app-AccountAuditTracking-fresh" sqlView. Click the Help button.');
          this.setState({errors:'Cannot find "app-AccountAuditTracking-fresh" sqlView'});
        }
        if (stale === false){
          actions.showSnackbarMessage('Cannot find "app-AccountAuditTracking-stale" sqlView. Click the Help button.');
          this.setState({errors:'Cannot find "app-AccountAuditTracking-stale" sqlView'});
        }
        this.setState({sqlView_fresh_ID:fresh,sqlView_stale_ID:stale});
      })
      .catch(error=> {
        actions.showSnackbarMessage('Cannot find necessary sqlViews. Click the Help button.');
        this.setState({errors:'Cannot find necessary sqlViews'});
      });

    },

    getInitialState() {
        return {
          type:'stale',         // stale (longer than X days), fresh (within past X days)
          days:90,          // # days
          filterBy:'none',    // none, group, ou
          invertFilter:false, // select everyone not in the given params
          data:[],
          processing:false,
          errors:'',
          sqlView_fresh_ID:false,
          sqlView_stale_ID:false,
        };
    },

    handleTypeChange(event, index, value){
      this.setState({type:value});
    },

    handleFilterChange(event, index, value){
      this.setState({filterBy:value});
    },

    handleLengthChange(event, index, value){
      this.setState({days:index});
    },

    handleInvert(event, value){
      this.setState({invertFilter:value});
      console.log(value);
    },

    getOUTree(){
      console.log('hi')
    },

    process(){

      const d2 = this.props.d2;
      const api = d2.Api.getApi();
      this.setState({processing:true});

      if (this.state.sqlView_fresh_ID === false || this.state.sqlView_stale_ID === false){
        actions.showSnackbarMessage('Necessary sqlViews have not been not created. Aborting.');
        return;
      }

      //figure out the lastLoginDate
      var lastLoginDate = new Date();
      lastLoginDate.setDate(lastLoginDate.getDate() - this.state.days);

      //generate the correct sqlview path
      let route = 'sqlViews/';
      switch (this.state.type){
        case 'stale':
          route = route + this.state.sqlView_stale_ID;
        break;
        case 'fresh':
          route = route + this.state.sqlView_fresh_ID;
        break;
      }
      route = route + '/data.json?var=lastLoginDate:'+lastLoginDate.toISOString().substr(0,10);

      api.get(route).then(promise=>{
        if (promise.hasOwnProperty('rows')){
          this.setState({
            data:promise.rows,
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

    },

    render() {
        const d2 = this.props.d2;

        return (
            <div className="wrapper">
              <HelpDialog style={{float:"right"}} title={"App Help"} content={help.help} />

              <Paper className='paper' style={{'minWidth':'600px'}}>
                <h3 className="subdued title_description">{d2.i18n.getTranslation('app_listing')}</h3>

                <div style={{'width':'50%','float':'left'}}>
                  <SelectField  value={this.state.type}
                                onChange={this.handleTypeChange}
                                floatingLabelText='Find Users'
                                maxHeight={200}
                                style={{'float':'left'}}>
                    <MenuItem value='fresh' key='fresh' label='Fresh' primaryText='Last logged in &lt; X' />
                    <MenuItem value='stale' key='stale' label='Stale' primaryText='Last logged in &gt; X'/>
                  </SelectField>

                  <div style={{'float':'left','clear':'both','width':'10em'}} >
                    <span style={{'float':'right'}}>{this.state.days} days ago</span>
                    <Slider
                        step={1}
                        value={this.state.days}
                        defaultValue={30}
                        min={1}
                        max={180}
                        onChange={this.handleLengthChange}
                        />
                  </div>
                </div>
                <div style={{'width':'50%','float':'left'}}>
                  <SelectField  value={this.state.filterBy}
                                onChange={this.handleFilterChange}
                                floatingLabelText='Filter By'
                                maxHeight={200}
                                style={{'float':'left'}}>
                    <MenuItem value='none' key='none' primaryText='-' />
                    <MenuItem value='group' key='group' primaryText='User Group' />
                    <MenuItem value='ou' key='ou' primaryText='Organizational Unit' />
                  </SelectField>

                  {this.getOUTree()}
{/*
                  <OrgUnitSelectAll
                               root=
                               selected={this.state.selected}
                               initiallyExpanded={this.props.root.id}
                               onClick={(e) => { e.target.parentNode.parentNode.firstChild.click(e); }}
                           />

                  <p>[Filter Options Box]</p>

                  <Checkbox label="Invert Filter"
                        checked={this.state.invertFilter}
                        onCheck={this.handleInvert} />
                        */}
                </div>
                <RaisedButton
                  label="Search"
                  labelPosition="before"
                  primary={true}
                  disabled={this.state.processing}
                  onClick={this.process}
                  icon={<FontIcon className="material-icons">search</FontIcon>}
                  style={{'clear':'both','float':'left'}}
                />
              </Paper>

              <Paper className="paper" style={{'float':'left','clear':'both'}}>


                <Table selectable={false}>
                  <TableHeader displaySelectAll={false} adjustForCheckbox={false}>
                    <TableRow selectable={false}>
                      <TableHeaderColumn>
                        Name
                      </TableHeaderColumn>
                      <TableHeaderColumn>
                        ID
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
                      <TableHeaderColumn>
                        Edit
                      </TableHeaderColumn>
                      <TableHeaderColumn>
                        Disable
                      </TableHeaderColumn>
                      <TableHeaderColumn>
                        Delete
                      </TableHeaderColumn>
                    </TableRow>
                  </TableHeader>
                  <TableBody
                            displayRowCheckbox={false}
                            showRowHover={true}
                            stripedRows={true}
                          >


                            {this.state.data.map( (row, index) => (
                              <TableRow key={row[0]} selectable={false}>
                                <TableRowColumn>{row[1]}</TableRowColumn>
                                <TableRowColumn>{row[7]}</TableRowColumn>
                                <TableRowColumn>{row[10]}</TableRowColumn>
                                <TableRowColumn>
                                  {(row[3]=="false")?<FontIcon className="material-icons">check</FontIcon>:null}
                                </TableRowColumn>
                                <TableRowColumn>{row[2]}</TableRowColumn>
                                <TableRowColumn>{row[5]}</TableRowColumn>
                                <TableRowColumn>
                                  <IconButton tooltip="Font Icon">
                                    <FontIcon className="material-icons">edit</FontIcon>
                                  </IconButton>
                                </TableRowColumn>
                                <TableRowColumn>
                                  <IconButton tooltip="Font Icon">
                                    <FontIcon className="material-icons">block</FontIcon>
                                  </IconButton>
                                </TableRowColumn>
                                <TableRowColumn>
                                  <IconButton tooltip="Font Icon">
                                    <FontIcon className="material-icons">delete</FontIcon>
                                  </IconButton>
                                </TableRowColumn>
                              </TableRow>
                              ))}
                  </TableBody>
                </Table>
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
