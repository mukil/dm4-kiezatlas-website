package de.kiezatlas.website.migrations;

import de.deepamehta.core.Topic;
import de.deepamehta.core.service.Inject;
import de.deepamehta.core.service.Migration;
import de.deepamehta.core.service.accesscontrol.SharingMode;
import de.deepamehta.accesscontrol.AccessControlService;
import de.deepamehta.workspaces.WorkspacesService;
import static de.kiezatlas.website.WebsiteService.CONFIRMATION_WS_NAME;
import static de.kiezatlas.website.WebsiteService.CONFIRMATION_WS_URI;
import java.util.logging.Logger;



public class Migration4 extends Migration {

    private Logger log = Logger.getLogger(getClass().getName());

    @Inject private WorkspacesService workspaceService;

    @Inject private AccessControlService acService;

    @Override
    public void run() {
        log.info("##### Create seperate \"Confirmation\"-Workspace in Kiezatlas Website Migration Nr. 4 #####");
        // 1) Create new "Confirmation" workspace
        Topic workspace = workspaceService.createWorkspace(CONFIRMATION_WS_NAME, CONFIRMATION_WS_URI, SharingMode.COLLABORATIVE);
        acService.setWorkspaceOwner(workspace, AccessControlService.ADMIN_USERNAME);
    }

}