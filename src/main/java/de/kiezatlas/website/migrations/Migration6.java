package de.kiezatlas.website.migrations;

import de.deepamehta.core.Topic;
import de.deepamehta.core.service.Inject;
import de.deepamehta.core.service.Migration;
import de.deepamehta.core.service.accesscontrol.SharingMode;
import de.deepamehta.plugins.accesscontrol.AccessControlService;
import de.deepamehta.plugins.workspaces.WorkspacesService;
import static de.kiezatlas.website.WebsiteService.CONFIRMATION_WS_NAME;
import static de.kiezatlas.website.WebsiteService.CONFIRMATION_WS_URI;
import java.util.logging.Logger;



public class Migration6 extends Migration {

    private Logger log = Logger.getLogger(getClass().getName());

    @Inject private WorkspacesService workspaceService;

    @Inject private AccessControlService acService;

    @Override
    public void run() {
        log.info("##### Create seperate \"Confirmation\"-Workspace in Kiezatlas Website Migration Nr. 6 #####");
        // 1) Create new "Confirmation" workspace
        Topic workspace = workspaceService.createWorkspace(CONFIRMATION_WS_NAME, CONFIRMATION_WS_URI, SharingMode.PUBLIC);
        acService.setWorkspaceOwner(workspace, AccessControlService.ADMIN_USERNAME);
    }

}