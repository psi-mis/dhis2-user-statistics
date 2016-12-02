import React from 'react';

import { getInstance } from 'd2/lib/d2';

import Paper from 'material-ui/lib/paper';
import Snackbar from 'material-ui/lib/snackbar';
import {Table, TableBody, TableHeader, TableHeaderColumn, TableRow, TableRowColumn} from 'material-ui/lib/table';
import CircularProgress from 'material-ui/lib/circular-progress';
import {green500, red500, yellow500} from 'material-ui/lib/styles/colors';

import AppTheme from '../colortheme';
import actions from '../actions';
import HelpDialog from './HelpDialog.component';

const help = {
  help:(
    <div>
      <p>
        Summary metrics on user status.
      </p>
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


      //get user groups for display
      api.get('/userGroups?paging=false').then(promise=>{
        if (promise.hasOwnProperty('userGroups')){
          console.log(promise.userGroups);
          this.setState({
            userGroups:promise.userGroups,
          });
        }
        else{
          this.setState({
            userGroups:[],
          })
        }
      })
      .catch(err => console.log(err));

    },

    getInitialState() {
      return {
        dashUg:[],
        userGroups:[],
      };
    },

    render() {
        const d2 = this.props.d2;



        return (
            <div className="wrapper">
              <HelpDialog style={{float:"right"}} title={"App Help"} content={help.help} />

              <Paper className='paper' style={{'minWidth':'800px'}}>
                <h3 className="subdued title_description">{d2.i18n.getTranslation('app_dashboard')}</h3>



              </Paper>

          </div>
        );
    },
});
