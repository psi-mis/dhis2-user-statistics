// Based upon @link http://www.highcharts.com/blog/192-use-highcharts-to-create-charts-in-react

import React from 'react';
import Highcharts from 'highcharts';

export default React.createClass({
  propTypes: {
    container: React.PropTypes.string,
    options: React.PropTypes.object,
    groups: React.PropTypes.object,
    renderChart: React.PropTypes.bool,
  },
  // When the DOM is ready, create the chart.
  componentDidMount() {
    // Extend Highcharts with modules
    if (this.props.modules) {
      this.props.modules.forEach(function (module) {
        module(Highcharts);
      });
    }
   this.updateChart({});
  },
  createEmtyChat() {
    // Set container which the chart should render to.
    this.chart = new Highcharts[this.props.type || "Chart"](this.props.container, this.props.options);
  },
  componentWillReceiveProps(nextProps) {
    if (!this.hasOwnProperty('chart')) {
      return;
    }  
    if(nextProps.renderChart){
      this.updateChart(nextProps.groups);
    }
  },

  updateChart(groups) {
    //
    //console.log(groups);
    this.createEmtyChat();
    //
    for (let g of Object.keys(groups)) {
      if (!this.props.groups.hasOwnProperty(g)) {
        continue;
      }
      let group = this.props.groups[g];
      if (!group.hasOwnProperty('data')) {
        continue;
      }
      let data = group.data;
      let ranges = Object.keys(data);
      if (this.chart.axes[0].categories.indexOf(group.displayName) < 0) {
        this.chart.axes[0].categories.push(group.displayName);
        for (let i in ranges) {
          if (!this.chart.series.hasOwnProperty(i)) {
            this.chart.addSeries({ name: ranges[i] });
          }
          this.chart.series[i].addPoint(data[ranges[i]], true, false);
        }
      }
    }
  },
  //Destroy chart before unmount.
  componentWillUnmount() {
    this.chart.destroy();
  },
  //Create the div which the chart will be rendered to.
  render: function () {
    return React.createElement('div', { id: this.props.container });
  }
});
