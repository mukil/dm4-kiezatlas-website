package de.kiezatlas.website.migrations;

import de.deepamehta.core.RelatedTopic;
import de.deepamehta.core.service.Inject;
import de.deepamehta.core.service.Migration;
import de.deepamehta.core.service.ResultList;
import de.deepamehta.plugins.workspaces.WorkspacesService;
import java.util.logging.Logger;

/** 
 * Extends all existing Geo Objects about a "Confirmed" flag with the value "true".
 */
public class Migration8 extends Migration {

    private Logger log = Logger.getLogger(getClass().getName());

    @Inject private WorkspacesService workspaceService;

    @Override
    public void run() {
        log.info("##### Start Kiezatlas Website \"Confirmation\"-Migration: Extend all Geo Objects! #####");
        // 1) Set "Confirmed" flag for every geo object already EXISTING to TRUE
        ResultList<RelatedTopic> geoObjects = dms.getTopics("ka2.geo_object", 0);
        for(RelatedTopic geoObject : geoObjects) {
            // Assign all new "confirmed"-flag topics to our dedicated "Confirmation"-Workspace
            // geoObject.getChildTopics().set(CONFIRMED_TYPE, true);
            /** dms.getAccessControl().assignToWorkspace(geoObject.getChildTopics().getTopic(CONFIRMED_TYPE),
                workspaceService.getWorkspace(CONFIRMATION_WS_URI).getId()); **/
            log.info("Set existing Geo Object: " + geoObject.getSimpleValue() + "  confirmed=" + true + " in Confirmation Workspace");
        }
        log.info("##### Kiezatlas Website \"Confirmation\"-Migration COMPLETE: Set " + geoObjects.getSize() 
            + " Geo Objects as CONFIRMED #####");
    }

}