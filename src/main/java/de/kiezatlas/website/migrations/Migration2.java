package de.kiezatlas.website.migrations;

import de.deepamehta.core.Topic;
import de.deepamehta.core.TopicType;
import de.deepamehta.core.service.Inject;
import de.deepamehta.core.service.Migration;
import de.deepamehta.plugins.workspaces.WorkspacesService;

import java.util.logging.Logger;


/**
 * Revise the concept/implementation of the district editorial aspects.
 * @author malted
 */
public class Migration2 extends Migration {

    private Logger log = Logger.getLogger(getClass().getName());

    static final String KIEZATLAS_WORKSPACE_URI = "de.kiezatlas.workspace";

    @Inject private WorkspacesService workspaceService;

    @Override
    public void run() {
        
        log.info("##### Setup Bezirk Website Editorial Topic Type in Website Migration Nr. 2 #####");
        // 1) Assign all our types from migration1 to the "Kiezatlas" workspace so "admin" can edit these definitions
        Topic kiezatlas = workspaceService.getWorkspace(KIEZATLAS_WORKSPACE_URI);
        TopicType infoAreaType = dms.getTopicType("ka2.website.bezirk_info");
        workspaceService.assignTypeToWorkspace(infoAreaType, kiezatlas.getId());

    }
}