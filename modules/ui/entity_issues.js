import { event as d3_event, select as d3_select } from 'd3-selection';

import { svgIcon } from '../svg';
import { t } from '../util/locale';
import { uiDisclosure } from './disclosure';
import { utilHighlightEntities } from '../util';


export function uiEntityIssues(context) {
    var _selection = d3_select(null);
    var _activeIssueID;
    var _entityID;

    // Refresh on validated events
    context.validator().on('validated.entity_issues', function() {
         _selection.selectAll('.disclosure-wrap-entity_issues')
             .call(render);

        update();
    });


    function entityIssues(selection) {
        _selection = selection;

        selection
            .call(uiDisclosure(context, 'entity_issues', true)
                .content(render)
            );

        update();
    }


    function update() {
        var issues = context.validator().getEntityIssues(_entityID);

        _selection
            .classed('hide', issues.length === 0);

        _selection.selectAll('.hide-toggle-entity_issues span')
            .text(t('issues.list_title', { count: issues.length }));
    }


    function render(selection) {
        var issues = context.validator().getEntityIssues(_entityID);
        _activeIssueID = issues.length > 0 ? issues[0].id : null;


        var containers = selection.selectAll('.issue-container')
            .data(issues, function(d) { return d.id; });

        // Exit
        containers.exit()
            .remove();

        // Enter
        var containersEnter = containers.enter()
            .append('div')
            .attr('class', 'issue-container');


        var itemsEnter = containersEnter
            .append('div')
            .attr('class', function(d) { return 'issue severity-' + d.severity; })
            .on('mouseover.highlight', function(d) {
                // don't hover-highlight the selected entity
                var ids = d.entities
                    .filter(function(e) { return e.id !== _entityID; })
                    .map(function(e) { return e.id; });

                utilHighlightEntities(ids, true, context);
            })
            .on('mouseout.highlight', function(d) {
                var ids = d.entities
                    .filter(function(e) { return e.id !== _entityID; })
                    .map(function(e) { return e.id; });

                utilHighlightEntities(ids, false, context);
            });

        var labelsEnter = itemsEnter
            .append('div')
            .attr('class', 'issue-label')
            .on('click', function(d) {
                _activeIssueID = d.id;   // expand only the clicked item
                selection.selectAll('.issue-container')
                    .classed('active', function(d) { return d.id === _activeIssueID; });

                var extent = d.extent(context.graph());
                if (extent) {
                    var setZoom = Math.max(context.map().zoom(), 19);
                    context.map().centerZoomEase(extent.center(), setZoom);
                }
            });

        var textEnter = labelsEnter
            .append('span')
            .attr('class', 'issue-text');

        textEnter
            .append('span')
            .attr('class', 'issue-icon')
            .each(function(d) {
                var iconName = '#iD-icon-' + (d.severity === 'warning' ? 'alert' : 'error');
                d3_select(this)
                    .call(svgIcon(iconName));
            });

        textEnter
            .append('span')
            .attr('class', 'issue-message')
            .text(function(d) { return d.message; });


        var infoButton = labelsEnter
            .append('button')
            .attr('class', 'issue-info-button')
            .attr('title', t('icons.information'))
            .attr('tabindex', -1)
            .call(svgIcon('#iD-icon-inspect'));

        infoButton
            .on('click', function () {
                d3_event.stopPropagation();
                d3_event.preventDefault();
                this.blur();    // avoid keeping focus on the button - #4641

                var container = d3_select(this.parentNode.parentNode.parentNode);
                var info = container.selectAll('.issue-info');
                var isExpanded = info.classed('expanded');

                if (isExpanded) {
                    info
                        .transition()
                        .duration(200)
                        .style('max-height', '0px')
                        .style('opacity', '0')
                        .on('end', function () {
                            info.classed('expanded', false);
                        });
                } else {
                    info
                        .classed('expanded', true)
                        .transition()
                        .duration(200)
                        .style('max-height', '200px')
                        .style('opacity', '1');
                }
            });

        itemsEnter
            .append('ul')
            .attr('class', 'issue-fix-list');

        containersEnter
            .append('div')
            .attr('class', 'issue-info')
            .style('max-height', '0')
            .style('opacity', '0')
            .each(function(d) {
                d3_select(this)
                    .call(d.reference);
            });


        // Update
        containers = containers
            .merge(containersEnter)
            .classed('active', function(d) { return d.id === _activeIssueID; });


        // fixes
        var fixLists = containers.selectAll('.issue-fix-list');

        var fixes = fixLists.selectAll('.issue-fix-item')
            .data(function(d) { return d.fixes ? d.fixes : []; });

        var fixesEnter = fixes.enter()
            .append('li')
            .attr('class', function(d) {
                return 'issue-fix-item ' + (d.onClick ? 'actionable' : '');
            })
            .on('click', function(d) {
                if (d.onClick) {
                    utilHighlightEntities(d.entityIds, false, context);
                    d.onClick();
                    context.validator().validate();
                }
            })
            .on('mouseover.highlight', function(d) {
                utilHighlightEntities(d.entityIds, true, context);
            })
            .on('mouseout.highlight', function(d) {
                utilHighlightEntities(d.entityIds, false, context);
            });

        fixesEnter
            .append('span')
            .attr('class', 'fix-icon')
            .each(function(d) {
                var iconName = d.icon || 'iD-icon-wrench';
                if (iconName.startsWith('maki')) {
                    iconName += '-15';
                }
                d3_select(this).call(svgIcon('#' + iconName));
            });

        fixesEnter
            .append('span')
            .attr('class', 'fix-message')
            .text(function(d) { return d.title; });
    }


    entityIssues.entityID = function(val) {
        if (!arguments.length) return _entityID;
        if (_entityID !== val) {
            _entityID = val;
            _activeIssueID = null;
        }
        return entityIssues;
    };


    return entityIssues;
}
